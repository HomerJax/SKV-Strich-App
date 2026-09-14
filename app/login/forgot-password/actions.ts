"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = {
  error: string;
  success: string;
};

function normalizeNext(value: FormDataEntryValue | null) {
  const next = String(value ?? "").trim();

  if (!next) return "";
  if (!next.startsWith("/")) return "";
  if (next.startsWith("//")) return "";

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

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = normalizeNext(formData.get("next"));

  if (!email) {
    return {
      error: "missing-email",
      success: "",
    };
  }

  const supabase = await createClient();
  const baseUrl = await getBaseUrl();
  const redirectTo = next
    ? `${baseUrl}/login/reset-password?next=${encodeURIComponent(next)}`
    : `${baseUrl}/login/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return {
      error: error.message || "reset-failed",
      success: "",
    };
  }

  return {
    error: "",
    success: "reset-sent",
  };
}
