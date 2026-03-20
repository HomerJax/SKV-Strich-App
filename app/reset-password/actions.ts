"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

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
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  if (!password || !passwordConfirm) {
    redirect(
      buildResetPasswordRedirect({
        error: "Bitte beide Passwort-Felder ausfüllen.",
      })
    );
  }

  if (password.length < 8) {
    redirect(
      buildResetPasswordRedirect({
        error: "Das Passwort muss mindestens 8 Zeichen lang sein.",
      })
    );
  }

  if (password !== passwordConfirm) {
    redirect(
      buildResetPasswordRedirect({
        error: "Die beiden Passwörter stimmen nicht überein.",
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
        error:
          "Dein Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.",
      })
    );
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    redirect(
      buildResetPasswordRedirect({
        error:
          "Das Passwort konnte nicht gespeichert werden. Bitte fordere einen neuen Link an.",
      })
    );
  }

  redirect(
    "/login?message=" +
      encodeURIComponent("Dein Passwort wurde erfolgreich geändert.")
  );
}