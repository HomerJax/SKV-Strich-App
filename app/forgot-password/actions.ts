"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getServerI18n } from "@/lib/i18n/server";

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
  const { t } = await getServerI18n();
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect(
      buildForgotPasswordRedirect({
        error: t("forgotPassword.emailRequired"),
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
        error: t("forgotPassword.sendFailed"),
        email,
      })
    );
  }

  redirect(
    buildForgotPasswordRedirect({
      message:
        t("forgotPassword.sent"),
      email,
    })
  );
}