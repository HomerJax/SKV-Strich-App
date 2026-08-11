import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeInternalRedirect(value: FormDataEntryValue | null) {
  const target = String(value ?? "/admin/club").trim();

  if (!target) return "/admin/club";
  if (!target.startsWith("/")) return "/admin/club";
  if (target.startsWith("//")) return "/admin/club";

  return target;
}

function redirectToDeleteSource(
  request: NextRequest,
  redirectTo: string,
  clubDeleteError: string
) {
  const url = new URL(redirectTo, request.nextUrl.origin);

  if (redirectTo.startsWith("/admin/settings")) {
    url.searchParams.set("club_error", `delete_${clubDeleteError}`);
  } else {
    url.searchParams.set("club_delete_error", clubDeleteError);
  }

  return NextResponse.redirect(url, { status: 303 });
}

async function removeStorageFiles(bucket: string, paths: string[]) {
  const cleanPaths = Array.from(
    new Set(paths.map((path) => path.trim()).filter(Boolean))
  );

  if (cleanPaths.length === 0) return;

  const admin = createAdminClient();

  for (let index = 0; index < cleanPaths.length; index += 100) {
    const batch = cleanPaths.slice(index, index + 100);
    const { error } = await admin.storage.from(bucket).remove(batch);

    if (error) {
      console.warn(
        `Club deletion: files in ${bucket} could not be fully removed`,
        error
      );
    }
  }
}

export async function POST(request: NextRequest) {
  let redirectTo = "/admin/club";

  try {
    const formData = await request.formData();
    redirectTo = normalizeInternalRedirect(formData.get("redirect_to"));

    const confirmation = String(formData.get("confirmation") ?? "").trim();
    const acknowledgement = formData.get("acknowledgement") === "1";

    if (confirmation !== "CLUB LÖSCHEN" || !acknowledgement) {
      return redirectToDeleteSource(request, redirectTo, "confirmation");
    }

    const ctx = await getAuthContext();

    if (!ctx.user) {
      return NextResponse.redirect(
        new URL("/login", request.nextUrl.origin),
        { status: 303 }
      );
    }

    if (!ctx.activeClubId) {
      return NextResponse.redirect(
        new URL("/select-club", request.nextUrl.origin),
        { status: 303 }
      );
    }

    const membership =
      ctx.memberships.find(
        (item) =>
          item.club_id === ctx.activeClubId && item.id !== "__power_user__"
      ) ?? null;

    if (membership?.role !== "admin") {
      return redirectToDeleteSource(request, redirectTo, "unauthorized");
    }

    const admin = createAdminClient();

    const [
      { data: club, error: clubError },
      { data: sessions, error: sessionsError },
      { count: remainingMembershipCount, error: remainingMembershipsError },
    ] = await Promise.all([
      admin
        .from("clubs")
        .select("id, logo_path")
        .eq("id", ctx.activeClubId)
        .maybeSingle<{ id: string; logo_path: string | null }>(),
      admin
        .from("sessions")
        .select("winner_photo_path")
        .eq("club_id", ctx.activeClubId),
      admin
        .from("club_memberships")
        .select("id", { count: "exact", head: true })
        .eq("user_id", ctx.user.id)
        .neq("club_id", ctx.activeClubId),
    ]);

    if (clubError || sessionsError || remainingMembershipsError || !club) {
      console.error("Club deletion: preparation failed", {
        clubError,
        sessionsError,
        remainingMembershipsError,
      });
      return redirectToDeleteSource(request, redirectTo, "delete_failed");
    }

    const { error: notificationsError } = await admin
      .from("user_notifications")
      .delete()
      .eq("club_id", ctx.activeClubId);

    if (notificationsError) {
      console.error(
        "Club deletion: notifications could not be deleted",
        notificationsError
      );
      return redirectToDeleteSource(request, redirectTo, "delete_failed");
    }

    const { error: deleteClubError } = await admin
      .from("clubs")
      .delete()
      .eq("id", ctx.activeClubId);

    if (deleteClubError) {
      console.error(
        "Club deletion: club could not be deleted",
        deleteClubError
      );
      return redirectToDeleteSource(request, redirectTo, "delete_failed");
    }

    await Promise.all([
      club.logo_path
        ? removeStorageFiles("club-logos", [club.logo_path])
        : Promise.resolve(),
      removeStorageFiles(
        "session-photos",
        (sessions ?? [])
          .map((session) => session.winner_photo_path)
          .filter((path): path is string => Boolean(path))
      ),
    ]);

    const targetPath =
      ctx.isPowerUser || (remainingMembershipCount ?? 0) > 0
        ? "/select-club?club_deleted=1"
        : "/create-club?club_deleted=1";

    const response = NextResponse.redirect(
      new URL(targetPath, request.nextUrl.origin),
      { status: 303 }
    );
    response.cookies.delete("active_club_id");

    return response;
  } catch (error) {
    console.error("POST /api/admin/club/delete failed", error);
    return redirectToDeleteSource(request, redirectTo, "delete_failed");
  }
}
