import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function buildRedirect(
  url: URL,
  pathname: string,
  params?: Record<string, string>
) {
  const nextUrl = new URL(pathname, url.origin);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      nextUrl.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(nextUrl);
}

function getSafeNext(nextValue: string) {
  if (!nextValue) return "/";
  if (!nextValue.startsWith("/")) return "/";
  if (nextValue.startsWith("//")) return "/";
  return nextValue;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const nextValue = String(formData.get("next") ?? "").trim();
  const requestUrl = new URL(request.url);

  if (!firstName || !lastName) {
    return buildRedirect(requestUrl, "/onboarding", {
      error: "Vorname und Nachname sind erforderlich.",
      next: nextValue,
    });
  }

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
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginNext = nextValue
      ? `/onboarding?next=${encodeURIComponent(nextValue)}`
      : "/onboarding";

    return buildRedirect(requestUrl, "/login", {
      next: loginNext,
    });
  }

  const fullName = `${firstName} ${lastName}`.trim();

  const { data: existingPlayerByUser } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_guest", false)
    .limit(1)
    .maybeSingle();

  if (existingPlayerByUser) {
    const { error: updateError } = await supabase
      .from("players")
      .update({
        first_name: firstName,
        last_name: lastName,
        nickname: nickname || null,
        name: fullName,
        email: user.email ?? null,
      })
      .eq("id", existingPlayerByUser.id);

    if (updateError) {
      return buildRedirect(requestUrl, "/onboarding", {
        error: "Profil konnte nicht aktualisiert werden.",
        next: nextValue,
      });
    }

    return NextResponse.redirect(
      new URL(getSafeNext(nextValue), requestUrl.origin)
    );
  }

  const { data: existingPlayerByMail } = await supabase
    .from("players")
    .select("id")
    .eq("email", user.email ?? "")
    .eq("is_guest", false)
    .limit(1)
    .maybeSingle();

  if (existingPlayerByMail) {
    const { error: updateByMailError } = await supabase
      .from("players")
      .update({
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        nickname: nickname || null,
        name: fullName,
        email: user.email ?? null,
      })
      .eq("id", existingPlayerByMail.id);

    if (updateByMailError) {
      return buildRedirect(requestUrl, "/onboarding", {
        error: "Profil konnte nicht verknüpft werden.",
        next: nextValue,
      });
    }

    return NextResponse.redirect(
      new URL(getSafeNext(nextValue), requestUrl.origin)
    );
  }

  return buildRedirect(requestUrl, "/onboarding", {
    error:
      "Kein passendes Spielerprofil gefunden. Bitte wende dich an einen Admin.",
    next: nextValue,
  });
}