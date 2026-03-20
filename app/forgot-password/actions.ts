"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

function buildForgotPasswordRedirect(params: {
  error?: string;
  message?: string;
  email?: string;
}) {
  const search = new URLSearchParams();

  if (params.error) search.set("error", params.error);
  if (params.message) search.set("message", params.message);
  if (params.email) search.set("email", params.email);

  const query = search.toString();
  return query ? `/forgot-password?${query}` : "/forgot-password";
}

export async function forgotPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect(
      buildForgotPasswordRedirect({
        error: "Bitte gib deine E-Mail-Adresse ein.",
      })
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(
    "/reset-password"
  )}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    redirect(
      buildForgotPasswordRedirect({
        error: "Der Reset-Link konnte nicht gesendet werden. Bitte versuche es erneut.",
        email,
      })
    );
  }

  redirect(
    buildForgotPasswordRedirect({
      message:
        "Wenn ein Konto mit dieser E-Mail existiert, wurde ein Reset-Link versendet.",
      email,
    })
  );
}