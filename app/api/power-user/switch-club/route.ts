import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { getServerI18n } from "@/lib/i18n/server";

type RequestBody = {
  clubId?: string;
  redirectTo?: string;
};

function normalizeRedirectTo(value: unknown) {
  const input = typeof value === "string" ? value.trim() : "";

  if (!input) return "/";
  if (!input.startsWith("/")) return "/";
  if (input.startsWith("//")) return "/";

  return input;
}

export async function POST(request: Request) {
  const { t } = await getServerI18n();
  try {
    const ctx = await getAuthContext();

    if (!ctx.user) {
      return NextResponse.json({ error: t("powerSwitch.notSignedIn") }, { status: 401 });
    }

    if (!ctx.isPowerUser) {
      return NextResponse.json(
        { error: t("powerSwitch.forbidden") },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => null)) as RequestBody | null;
    const clubId = body?.clubId?.trim();
    const redirectTo = normalizeRedirectTo(body?.redirectTo);

    if (!clubId) {
      return NextResponse.json({ error: t("powerSwitch.clubIdMissing") }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: club, error } = await supabase
      .from("clubs")
      .select("id")
      .eq("id", clubId)
      .maybeSingle<{ id: string }>();

    if (error) {
      console.error("switch-club: club lookup failed", error);
      return NextResponse.json(
        { error: t("powerSwitch.clubCheckFailed") },
        { status: 500 }
      );
    }

    if (!club) {
      return NextResponse.json(
        { error: t("powerSwitch.clubNotFound") },
        { status: 404 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set("active_club_id", clubId, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({
      ok: true,
      activeClubId: clubId,
      redirectTo,
    });
  } catch (error) {
    console.error("switch-club unexpected error", error);

    return NextResponse.json(
      { error: t("powerSwitch.unexpected") },
      { status: 500 }
    );
  }
}