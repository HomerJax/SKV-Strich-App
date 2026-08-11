import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { scheduleClubDeletion } from "@/lib/clubs/deletion";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClubRow = {
  id: string;
  display_name: string | null;
  name: string | null;
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
    const { data: club, error } = await admin
      .from("clubs")
      .select("id, display_name, name")
      .eq("id", clubId)
      .maybeSingle<ClubRow>();

    if (error || !club) {
      return redirectToCleanup(request, { delete_error: "not_found" });
    }

    const clubName = getClubName(club);

    if (confirmation !== clubName) {
      return redirectToCleanup(request, {
        delete_error: "confirmation",
        club_id: clubId,
      });
    }

    const result = await scheduleClubDeletion({
      clubId,
      deletedBy: ctx.user.id,
    });

    const response = redirectToCleanup(request, {
      deleted: "1",
      deleted_name: result.clubName,
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
