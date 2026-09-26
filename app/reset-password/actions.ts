"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { getServerI18n } from "@/lib/i18n/server";

function buildResetPasswordRedirect(params: {
  error?: string;
  message?: string;
}) {
  const search = new URLSearchParams();

  if (params.error) search.set("error", params.error);
  if (params.message) search.set("message", params.message);

  const query = search.toString();
  return query ? `/reset-password?${query}` : "/reset-password";
}

export async function resetPasswordAction(formData: FormData) {
  const { t } = await getServerI18n();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  if (!password || !passwordConfirm) {
    redirect(
      buildResetPasswordRedirect({
        error: t("resetPassword.required"),
      })
    );
  }

  if (password.length < 8) {
    redirect(
      buildResetPasswordRedirect({
        error: t("resetPassword.minLength"),
      })
    );
  }

  if (password !== passwordConfirm) {
    redirect(
      buildResetPasswordRedirect({
        error: t("resetPassword.mismatch"),
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      buildResetPasswordRedirect({
        error: t("resetPassword.invalidLink"),
      })
    );
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    redirect(
      buildResetPasswordRedirect({
        error: t("resetPassword.saveError"),
      })
    );
  }

  redirect(
    "/login?message=" +
      encodeURIComponent(t("resetPassword.success"))
  );
}