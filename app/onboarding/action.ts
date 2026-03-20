"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

function getSafeNext(next: string | null | undefined) {
  if (!next) return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  return next;
}

function buildOnboardingRedirect(params: {
  error?: string;
  message?: string;
  next?: string;
}) {
  const search = new URLSearchParams();

  if (params.error) search.set("error", params.error);
  if (params.message) search.set("message", params.message);
  if (params.next) search.set("next", params.next);

  const query = search.toString();
  return query ? `/onboarding?${query}` : "/onboarding";
}

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function completeOnboardingAction(formData: FormData) {
  const firstName = normalizeText(formData.get("first_name"));
  const lastName = normalizeText(formData.get("last_name"));
  const nicknameRaw = normalizeText(formData.get("nickname"));
  const next = getSafeNext(normalizeText(formData.get("next")));

  if (!firstName || !lastName) {
    redirect(
      buildOnboardingRedirect({
        error: "Bitte Vorname und Nachname ausfüllen.",
        next,
      })
    );
  }

  const nickname = nicknameRaw || null;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginNext = `/onboarding${next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;
    redirect(`/login?next=${encodeURIComponent(loginNext)}`);
  }

  const { error } = await supabase.rpc("complete_my_onboarding", {
    p_first_name: firstName,
    p_last_name: lastName,
    p_nickname: nickname,
  });

  if (error) {
    redirect(
      buildOnboardingRedirect({
        error: "Onboarding konnte nicht abgeschlossen werden. Bitte versuche es erneut.",
        next,
      })
    );
  }

  redirect(next || "/");
}