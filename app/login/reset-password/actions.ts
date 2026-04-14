"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ResetPasswordState = {
  error: string;
};

function normalizeNext(value: FormDataEntryValue | null) {
  const next = String(value ?? "").trim();

  if (!next) return "";
  if (!next.startsWith("/")) return "";
  if (next.startsWith("//")) return "";

  return next;
}

export async function updatePasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");
  const next = normalizeNext(formData.get("next"));

  if (!password) {
    return { error: "missing-password" };
  }

  if (password.length < 8) {
    return { error: "password-too-short" };
  }

  if (password !== passwordConfirm) {
    return { error: "password-mismatch" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { error: error.message || "update-failed" };
  }

  if (next) {
    redirect(next);
  }

  redirect("/login");
}