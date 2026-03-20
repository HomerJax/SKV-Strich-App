"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

function getSafeNext(next: string | null | undefined) {
  if (!next) return "";
  if (!next.startsWith("/")) return "";
  if (next.startsWith("//")) return "";
  return next;
}

function buildSignupRedirect(params: {
  error?: string;
  message?: string;
  next?: string;
  email?: string;
}) {
  const search = new URLSearchParams();

  if (params.error) search.set("error", params.error);
  if (params.message) search.set("message", params.message);
  if (params.next) search.set("next", params.next);
  if (params.email) search.set("email", params.email);

  const query = search.toString();
  return query ? `/signup?${query}` : "/signup";
}

function buildOnboardingRedirect(next: string) {
  const search = new URLSearchParams();
  if (next) search.set("next", next);

  const query = search.toString();
  return query ? `/onboarding?${query}` : "/onboarding";
}

export async function signupAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rawNext = String(formData.get("next") ?? "");
  const next = getSafeNext(rawNext);

  if (!email || !password) {
    redirect(
      buildSignupRedirect({
        error: "Bitte E-Mail und Passwort eingeben.",
        next,
        email,
      })
    );
  }

  if (password.length < 8) {
    redirect(
      buildSignupRedirect({
        error: "Das Passwort muss mindestens 8 Zeichen lang sein.",
        next,
        email,
      })
    );
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
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  const emailRedirectTo = `${origin}/auth/callback`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
    },
  });

  if (error) {
    let message = "Registrierung fehlgeschlagen.";

    if (error.message.toLowerCase().includes("already registered")) {
      message = "Für diese E-Mail existiert bereits ein Konto.";
    }

    redirect(
      buildSignupRedirect({
        error: message,
        next,
        email,
      })
    );
  }

  redirect(buildOnboardingRedirect(next));
}