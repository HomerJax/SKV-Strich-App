import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getServerI18n } from "@/lib/i18n/server";

function getSafeNext(next: string | null) {
  if (!next) return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  return next;
}

function getRedirectOrigin(requestOrigin: string) {
  return requestOrigin.includes("localhost")
    ? requestOrigin
    : "https://www.strikr.team";
}

export async function GET(request: Request) {
  const { t } = await getServerI18n();
  const { searchParams, origin: requestOrigin } = new URL(request.url);
  const origin = getRedirectOrigin(requestOrigin);

  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next = getSafeNext(nextParam);

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        `${origin}/login/forgot-password?error=${encodeURIComponent(
          t("auth.resetInvalid")
        )}`
      );
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${origin}/login/forgot-password?error=${encodeURIComponent(
        t("auth.resetInvalid")
      )}`
    );
  }

  if (next === "/reset-password" || next.startsWith("/login/reset-password")) {
    return NextResponse.redirect(new URL(next, origin));
  }

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_guest", false)
    .limit(1)
    .maybeSingle();

  if (!player) {
    const onboardingUrl = new URL("/onboarding", origin);

    if (next && next !== "/") {
      onboardingUrl.searchParams.set("next", next);
    }

    return NextResponse.redirect(onboardingUrl);
  }

  return NextResponse.redirect(new URL(next || "/", origin));
}
