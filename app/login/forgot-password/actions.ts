"use server";

import { headers } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type ForgotPasswordState = { error: string; success: string; };

function normalizeNext(value: FormDataEntryValue | null) {
  const next = String(value ?? "").trim();
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "";
  return next;
}

async function getBaseUrl() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  if (host.includes("localhost")) {
    const proto = headerStore.get("x-forwarded-proto") ?? "http";
    return `${proto}://${host}`;
  }
  return "https://www.strikr.team";
}

export async function requestPasswordResetAction(_prevState: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = normalizeNext(formData.get("next"));
  if (!email) return { error: "missing-email", success: "" };

  const baseUrl = await getBaseUrl();
  const recoveryUrl = new URL("/auth/recovery", baseUrl);
  if (next) recoveryUrl.searchParams.set("next", next);

  // Password-reset links are commonly opened from Gmail/Safari or another
  // browser than the one that requested them. PKCE stores a verifier in the
  // requesting browser, so that flow breaks in exactly that situation. Use
  // Supabase's implicit recovery flow here: the email link carries the recovery
  // session itself and /auth/recovery persists it before showing the form.
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "implicit",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: recoveryUrl.toString(),
  });
  if (error) return { error: error.message || "reset-failed", success: "" };
  return { error: "", success: "reset-sent" };
}
