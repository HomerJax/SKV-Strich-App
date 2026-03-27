import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AUTH_ROUTES } from "@/lib/auth/routes";

function getFounderEmails() {
  return (process.env.FOUNDER_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isFounderEmail(email: string | null | undefined) {
  if (!email) return false;
  return getFounderEmails().includes(email.trim().toLowerCase());
}

export async function requireFounder() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email || !isFounderEmail(user.email)) {
    redirect(AUTH_ROUTES.dashboard);
  }

  return {
    user,
    email: user.email,
  };
}