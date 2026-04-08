"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function normalizeNext(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();

  if (!trimmed.startsWith("/")) return "";
  return trimmed;
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const next = normalizeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "E-Mail und Passwort sind erforderlich." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (next) {
    redirect(`/onboarding?next=${encodeURIComponent(next)}`);
  }

  redirect("/onboarding");
}