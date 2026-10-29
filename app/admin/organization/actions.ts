"use server";

import { randomUUID, randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageClub } from "@/lib/auth/access";
import { requireClub, requireUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCashboxPilotClub } from "@/lib/cashbox/pilot-structure";

type Team = { id: string; name: string; status: "linked" | "planned"; clubId: string | null };
type Organization = {
  owner_club_id: string;
  name: string;
  teams: Team[];
  admin_user_ids: string[];
};

const back = (query: Record<string, string>) => `/admin/organization?${new URLSearchParams(query)}`;
const refresh = () => {
  revalidatePath("/admin/organization");
  revalidatePath("/admin/settings");
  revalidatePath("/mannschaftskasse");
  revalidatePath("/home");
};

export async function managePilotOrganizationAction(form: FormData) {
  const ctx = await requireClub();
  if (!isCashboxPilotClub(ctx.clubId) || ctx.isSupportView) redirect("/home");
  const db = createAdminClient();
  const { data, error: loadError } = await db.from("pilot_parent_clubs")
    .select("owner_club_id,name,teams,admin_user_ids")
    .eq("owner_club_id", ctx.clubId).maybeSingle();
  if (loadError) redirect(back({ error: "load" }));
  const org = data as Organization | null;
  const isTeamAdmin = canManageClub({ isPowerUser: ctx.isPowerUser, role: ctx.membership.role });
  const isOrgAdmin = org?.admin_user_ids?.includes(ctx.user.id) === true;
  const action = String(form.get("intent") ?? "");
  if (!org && action !== "create") redirect(back({ error: "no_org" }));
  // After creation, club and organization administration are separate roles.
  if (org ? !isOrgAdmin : !isTeamAdmin) redirect("/home");

  const name = String(form.get("name") ?? "").trim().slice(0, 100);
  if (action === "create") {
    if (org) redirect(back({ error: "already" }));
    if (name.length < 2) redirect(back({ error: "name" }));
    const { data: club } = await db.from("clubs").select("display_name,name")
      .eq("id", ctx.clubId).maybeSingle();
    const initialTeams: Team[] = [{
      id: `club:${ctx.clubId}`, name: club?.display_name || club?.name || "1. FC Strikr 2026",
      status: "linked", clubId: ctx.clubId,
    }];
    const { error } = await db.from("pilot_parent_clubs").insert({
      owner_club_id: ctx.clubId, name,
      teams: initialTeams, admin_user_ids: [ctx.user.id],
      created_by: ctx.user.id, updated_by: ctx.user.id,
    });
    if (error) redirect(back({ error: "save" }));
    refresh();
    redirect(back({ saved: "1" }));
  }

  if (!org) redirect(back({ error: "no_org" }));
  const teams = Array.isArray(org.teams) ? org.teams : [];
  const changes: Record<string, unknown> = { updated_by: ctx.user.id, updated_at: new Date().toISOString() };

  if (action === "rename") {
    if (name.length < 2) redirect(back({ error: "name" }));
    changes.name = name;
  } else if (action === "add_team") {
    if (name.length < 2 || teams.length >= 25) redirect(back({ error: "team" }));
    if (teams.some(team => team.name.trim().toLowerCase() === name.toLowerCase()))
      redirect(back({ error: "duplicate" }));
    // Additional teams are planning entries; real clubs need explicit two-sided authorization later.
    changes.teams = [...teams, { id: `planned:${randomUUID()}`, name, status: "planned", clubId: null }];
  } else if (action === "remove_team") {
    const id = String(form.get("team_id") ?? "");
    const found = teams.find(team => team.id === id);
    if (!found || found.status !== "planned" || found.clubId) redirect(back({ error: "team" }));
    changes.teams = teams.filter(team => team.id !== id);
  } else if (action === "admins") {
    const requested = [...new Set(form.getAll("admin_user_ids").map(value => String(value)).filter(Boolean))];
    if (requested.length === 0 || requested.length > 25) redirect(back({ error: "admins" }));
    const { data: linkedTeams, error: teamsError } = await db.from("pilot_parent_club_team_links")
      .select("target_club_id").eq("owner_club_id", ctx.clubId).eq("status", "linked");
    if (teamsError) redirect(back({ error: "admins" }));
    const clubIds = [ctx.clubId, ...(linkedTeams ?? []).map(row => row.target_club_id)];
    const { data: members, error } = await db.from("club_memberships")
      .select("user_id").in("club_id", clubIds).in("user_id", requested);
    if (error || new Set((members ?? []).map(row => row.user_id)).size !== requested.length)
      redirect(back({ error: "admins" }));
    changes.admin_user_ids = requested;
  } else {
    redirect(back({ error: "action" }));
  }

  const { error: updateError } = await db.from("pilot_parent_clubs")
    .update(changes).eq("owner_club_id", ctx.clubId);
  if (updateError) redirect(back({ error: "save" }));
  refresh();
  redirect(back({ saved: "1" }));
}


/**
 * The parent-club admin may request a link, but cannot approve for another
 * team. Approval is a separate, deliberate action by one of its actual admins.
 * Existing club IDs, members, and financial records are never modified.
 */
export async function requestPilotTeamLinkAction(form: FormData) {
  const ctx = await requireClub();
  if (!isCashboxPilotClub(ctx.clubId) || ctx.isSupportView) redirect("/home");
  const db = createAdminClient();
  const { data: org, error: orgError } = await db.from("pilot_parent_clubs")
    .select("owner_club_id,admin_user_ids").eq("owner_club_id", ctx.clubId).maybeSingle();
  if (orgError || !org?.admin_user_ids?.includes(ctx.user.id)) redirect("/home");
  const targetId = String(form.get("target_club_id") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId) ||
      targetId === ctx.clubId) redirect(back({ error: "team" }));
  const [{ data: target }, { data: existing }] = await Promise.all([
    db.from("clubs").select("id").eq("id", targetId).is("deleted_at", null).maybeSingle(),
    db.from("pilot_parent_club_team_links").select("status").eq("owner_club_id",ctx.clubId)
      .eq("target_club_id", targetId).maybeSingle(),
  ]);
  if (!target || existing?.status === "linked") redirect(back({ error: "team" }));
  const { error } = await db.from("pilot_parent_club_team_links").upsert({
    owner_club_id: ctx.clubId, target_club_id: targetId, status: "pending",
    requested_by: ctx.user.id, requested_at: new Date().toISOString(),
    decided_by: null, decided_at: null,
  }, { onConflict: "owner_club_id,target_club_id" });
  if (error) redirect(back({ error: "team" }));
  refresh();
  redirect(back({ saved: "1" }));
}

export async function decidePilotTeamLinkAction(form: FormData) {
  // Importantly: no need to switch active club. Permission is checked against
  // the *target* club's administrator membership, never by a submitted role.
  const user = await requireUser();
  const id = String(form.get("link_id") ?? "");
  const decision = String(form.get("decision") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["accept", "decline", "leave"].includes(decision))
    redirect("/home");
  const db = createAdminClient();
  const { data: link, error } = await db.from("pilot_parent_club_team_links")
    .select("id,owner_club_id,target_club_id,status").eq("id", id).maybeSingle();
  if (error || !link || !isCashboxPilotClub(link.owner_club_id)) redirect("/home");
  const { data: membership } = await db.from("club_memberships")
    .select("role").eq("user_id",user.id).eq("club_id",link.target_club_id).eq("role","admin").maybeSingle();
  if (!membership) redirect("/home");
  if (decision === "leave" && link.status !== "linked")
    redirect("/admin/organization/invite/" + id + "?error=invalid");
  if (decision !== "leave" && link.status !== "pending")
    redirect("/admin/organization/invite/" + id + "?error=invalid");
  if (decision === "accept") {
    const { data: alreadyLinked } = await db.from("pilot_parent_club_team_links")
      .select("id").eq("target_club_id",link.target_club_id).eq("status","linked")
      .neq("id",id).maybeSingle();
    if (alreadyLinked) redirect("/admin/organization/invite/" + id + "?error=linked");
  }
  const nextStatus = decision === "accept" ? "linked" : decision === "decline" ? "declined" : "revoked";
  const { data: updated, error: updateError } = await db.from("pilot_parent_club_team_links")
    .update({ status: nextStatus, decided_by: user.id, decided_at: new Date().toISOString() })
    .eq("id",id).eq("status", decision === "leave" ? "linked" : "pending")
    .select("id").maybeSingle();
  if (updateError || !updated)
    redirect("/admin/organization/invite/" + id + "?error=update");
  refresh();
  redirect("/admin/organization/invite/" + id + "?saved=1");
}

export async function cancelPilotTeamLinkAction(form: FormData) {
  const ctx = await requireClub();
  if (!isCashboxPilotClub(ctx.clubId) || ctx.isSupportView) redirect("/home");
  const id = String(form.get("link_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect(back({ error: "team" }));
  const db = createAdminClient();
  const { data: org } = await db.from("pilot_parent_clubs")
    .select("admin_user_ids").eq("owner_club_id",ctx.clubId).maybeSingle();
  if (!org?.admin_user_ids?.includes(ctx.user.id)) redirect("/home");
  const { error } = await db.from("pilot_parent_club_team_links")
    .update({status:"revoked",decided_by:ctx.user.id,decided_at:new Date().toISOString()})
    .eq("id",id).eq("owner_club_id",ctx.clubId).in("status",["pending","linked"]);
  if (error) redirect(back({error:"team"}));
  refresh();
  redirect(back({saved:"1"}));
}

/** Create a 14-day invitation to a not-yet-existing strikr team.
 * The secret is visible only once; only its digest persists in Supabase. */
export async function issueNewTeamInviteAction(form: FormData) {
  const ctx = await requireClub();
  if (ctx.isSupportView || !isCashboxPilotClub(ctx.clubId)) redirect("/home");
  const db = createAdminClient();
  const {data: org} = await db.from("pilot_parent_clubs")
    .select("admin_user_ids,teams").eq("owner_club_id",ctx.clubId).maybeSingle();
  if (!org?.admin_user_ids?.includes(ctx.user.id)) redirect("/home");

  const nameHint = String(form.get("name_hint") ?? "").trim().slice(0,80);
  const plannedId = String(form.get("planned_team_id") ?? "").trim();
  if (nameHint.length < 2 || nameHint.length > 80) redirect(back({error:"name"}));
  if (plannedId && !(org.teams ?? []).some((t:{id:string;status:string}) =>
    t.id === plannedId && t.status === "planned")) redirect(back({error:"team"}));
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  const {error} = await db.from("pilot_parent_new_team_invites").insert({
    owner_club_id:ctx.clubId,source_club_id:ctx.clubId,
    token_hash:hash,name_hint:nameHint,planned_team_id:plannedId||null,
    created_by:ctx.user.id,
  });
  if (error) redirect(back({error:"invite"}));
  refresh();
  // This is a one-time display; do not log or permanently persist the token.
  redirect(back({new_team_invite:token}));
}

export async function revokeNewTeamInviteAction(form: FormData) {
  const ctx = await requireClub();
  if (ctx.isSupportView || !isCashboxPilotClub(ctx.clubId)) redirect("/home");
  const db = createAdminClient();
  const {data: org} = await db.from("pilot_parent_clubs")
    .select("admin_user_ids").eq("owner_club_id",ctx.clubId).maybeSingle();
  if (!org?.admin_user_ids?.includes(ctx.user.id)) redirect("/home");
  const id = String(form.get("id") ?? "");
  if (!/^[a-f0-9-]{36}$/i.test(id)) redirect(back({error:"invite"}));
  const {error} = await db.from("pilot_parent_new_team_invites")
    .update({status:"revoked"}).eq("owner_club_id",ctx.clubId)
    .eq("id",id).eq("status","pending");
  if (error) redirect(back({error:"invite"}));
  refresh();
  redirect(back({saved:"1"}));
}
