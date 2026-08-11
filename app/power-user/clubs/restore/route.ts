import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { restoreClub } from "@/lib/clubs/deletion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    if (!clubId) {
      return redirectToCleanup(request, { restore_error: "missing_club" });
    }

    const result = await restoreClub({
      clubId,
      restoredBy: ctx.user.id,
    });

    return redirectToCleanup(request, {
      restored: "1",
      restored_name: result.clubName,
    });
  } catch (error) {
    console.error("POST /power-user/clubs/restore failed", error);
    return redirectToCleanup(request, { restore_error: "restore_failed" });
  }
}
