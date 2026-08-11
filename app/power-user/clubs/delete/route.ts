import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClubRow = {
  id: string;
  display_name: string | null;
  name: string | null;
  logo_path: string | null;
};

type SessionRow = {
  winner_photo_path: string | null;
};

function getClubName(club: ClubRow) {
  return club.display_name?.trim() || club.name?.trim() || "Unbenannter Club";
}

function redirectToCleanup(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/power-user/clubs/cleanup", request.nextUrl.origin);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
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
        `Power user club deletion: files in ${bucket} could not be fully removed`,
        error
      );
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext();

    if (!ctx.user || !ctx.isPowerUser) {
      return NextResponse.redirect(new URL("/home", request.nextUrl.origin), {
        status: 303,
      });
    }

    const formData = await request.formData();
    const clubId = String(formData.get("club_id") ?? "").trim();
    const confirmation = String(formData.get("confirmation") ?? "").trim();

    if (!clubId || !confirmation) {
      return redirectToCleanup(request, { delete_error: "confirmation" });
    }

    const admin = createAdminClient();

    const [{ data: club, error: clubError }, { data: sessions, error: sessionsError }] =
      await Promise.all([
        admin
          .from("clubs")
          .select("id, display_name, name, logo_path")
          .eq("id", clubId)
          .maybeSingle<ClubRow>(),
        admin
          .from("sessions")
          .select("winner_photo_path")
          .eq("club_id", clubId),
      ]);

    if (clubError || sessionsError || !club) {
      console.error("Power user club deletion: preparation failed", {
        clubError,
        sessionsError,
        clubId,
      });
      return redirectToCleanup(request, { delete_error: "not_found" });
    }

    const clubName = getClubName(club);

    if (confirmation !== clubName) {
      return redirectToCleanup(request, {
        delete_error: "confirmation",
        club_id: clubId,
      });
    }

    const { error: notificationsError } = await admin
      .from("user_notifications")
      .delete()
      .eq("club_id", clubId);

    if (notificationsError) {
      console.error(
        "Power user club deletion: notifications could not be deleted",
        notificationsError
      );
      return redirectToCleanup(request, { delete_error: "delete_failed" });
    }

    const { error: deleteClubError } = await admin
      .from("clubs")
      .delete()
      .eq("id", clubId);

    if (deleteClubError) {
      console.error(
        "Power user club deletion: club could not be deleted",
        deleteClubError
      );
      return redirectToCleanup(request, { delete_error: "delete_failed" });
    }

    await Promise.all([
      club.logo_path
        ? removeStorageFiles("club-logos", [club.logo_path])
        : Promise.resolve(),
      removeStorageFiles(
        "session-photos",
        ((sessions ?? []) as SessionRow[])
          .map((session) => session.winner_photo_path)
          .filter((path): path is string => Boolean(path))
      ),
    ]);

    const response = redirectToCleanup(request, {
      deleted: "1",
      deleted_name: clubName,
    });

    if (ctx.activeClubId === clubId) {
      response.cookies.delete("active_club_id");
    }

    return response;
  } catch (error) {
    console.error("POST /power-user/clubs/delete failed", error);
    return redirectToCleanup(request, { delete_error: "delete_failed" });
  }
}
