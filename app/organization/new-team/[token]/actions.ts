"use server";

import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordGrowthEvent } from "@/lib/analytics/growth-funnel";

function inviteUrl(token: string, error?: string) {
  return `/organization/new-team/${token}${error ? "?error="+encodeURIComponent(error) : ""}`;
}
export async function acceptNewTeamInviteAction(form: FormData) {
  const user = await requireUser();
  const token = String(form.get("token") ?? "");
  if (!/^[a-f0-9]{64}$/.test(token)) redirect("/home");
  const name = String(form.get("team_name") ?? "").trim();
  const firstName = String(form.get("first_name") ?? "").trim();
  const lastName = String(form.get("last_name") ?? "").trim();
  const sport = String(form.get("sport_type") ?? "");
  const sports = ["football","handball","basketball","volleyball","ice_hockey","tennis","padel","other"];
  if (form.get("agree") !== "yes" || name.length < 2 || name.length > 80 ||
      firstName.length < 1 || firstName.length > 80 || lastName.length > 80 ||
      !sports.includes(sport)) redirect(inviteUrl(token,"invalid"));

  // SQL RPC is a single DB transaction with a locked, single-use invitation.
  // This never overwrites existing clubs, billing, players or finance tables.
  const hash = createHash("sha256").update(token).digest("hex");
  const db = createAdminClient();
  const {data: clubId, error} = await db.rpc("redeem_pilot_parent_new_team_invite", {
    p_token_hash: hash, p_user_id: user.id, p_team_name: name,
    p_sport_type: sport, p_first_name: firstName, p_last_name: lastName,
  });
  if (error || typeof clubId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(clubId)) {
    console.error("New team invitation redemption failed",error?.code);
    redirect(inviteUrl(token,"unavailable"));
  }
  // Duplicate logo references are unsafe: removing a logo from one club
  // deletes the object from storage. Copy the parent's logo to a NEW path
  // owned by the newly created club, without affecting the atomic creation
  // if storage has a temporary problem.
  try {
    const {data: redeemed} = await db.from("pilot_parent_new_team_invites")
      .select("source_club_id").eq("token_hash",hash)
      .eq("created_club_id",clubId).eq("consumed_by",user.id).maybeSingle();
    if (redeemed) {
      const {data: source} = await db.from("clubs")
        .select("logo_path").eq("id",redeemed.source_club_id).maybeSingle();
      if (source?.logo_path) {
        const extension = source.logo_path.split(".").pop()?.toLowerCase() || "png";
        const safeExtension = ["png","jpg","jpeg","webp"].includes(extension) ? extension : "png";
        const destination = `${clubId}/inherited-${randomUUID()}.${safeExtension}`;
        const {error: copyError} = await db.storage.from("club-logos")
          .copy(source.logo_path,destination);
        if (!copyError) {
          const {error: updateError} = await db.from("clubs")
            .update({logo_path:destination}).eq("id",clubId);
          if (updateError) await db.storage.from("club-logos").remove([destination]);
        }
      }
    }
  } catch {
    // New club and membership were committed correctly; logo is optional.
  }
  const store = await cookies();
  store.set("active_club_id",clubId,{
    path:"/",maxAge:60*60*24*365,sameSite:"lax",httpOnly:false,
    secure:process.env.NODE_ENV==="production",
  });
  // Optional telemetry must not undo a successfully provisioned club.
  try { await recordGrowthEvent("club_created",clubId); } catch {}
  revalidatePath("/admin/organization");
  revalidatePath("/select-club");
  revalidatePath("/home");
  // Configuration was copied; recipient may inspect and personalize it.
  redirect("/club-setup?created=1&step=team");
}
