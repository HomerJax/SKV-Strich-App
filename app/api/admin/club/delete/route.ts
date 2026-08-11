import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { scheduleClubDeletion } from "@/lib/clubs/deletion";

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
      return NextResponse.redirect(new URL("/login", request.nextUrl.origin), {
        status: 303,
      });
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

    await scheduleClubDeletion({
      clubId: ctx.activeClubId,
      deletedBy: ctx.user.id,
    });

    const response = NextResponse.redirect(
      new URL("/select-club?club_deleted=1&restore_days=14", request.nextUrl.origin),
      { status: 303 }
    );
    response.cookies.delete("active_club_id");

    return response;
  } catch (error) {
    console.error("POST /api/admin/club/delete failed", error);
    return redirectToDeleteSource(request, redirectTo, "delete_failed");
  }
}
