"use server";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { requirePowerUser } from "@/lib/auth/power-user";

const QA_CLUB_ID = "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60";
const QA_EMAIL_DOMAIN = "qa.strikr.team";
function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
}
export async function createQaInvite(): Promise<{ error: string; joinPath: string }> {
  const ctx = await requirePowerUser();
  if (!ctx.user) return { error: "Nicht autorisiert.", joinPath: "" };
  const admin = adminClient();
  const token = randomBytes(32).toString("hex");
  const { error } = await admin.from("invites").insert({ club_id: QA_CLUB_ID, role: "member", token, invited_by: ctx.user.id, expires_at: new Date(Date.now() + 3600000).toISOString() });
  return error ? { error: "Testeinladung konnte nicht erstellt werden.", joinPath: "" } : { error: "", joinPath: `/join?token=${token}` };
}

export async function createQaIdentity(): Promise<{ error: string; email: string; password: string; joinPath: string }> {
  const ctx = await requirePowerUser();
  const failure = (error: string) => ({ error, email: "", password: "", joinPath: "" });
  if (!ctx.user) return failure("Nicht autorisiert.");
  const admin = adminClient();
  const email = `onboarding-${randomBytes(10).toString("hex")}@${QA_EMAIL_DOMAIN}`;
  const password = randomBytes(24).toString("base64url");
  const { data, error: authError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { strikr_qa: true, strikr_qa_club_id: QA_CLUB_ID, strikr_qa_owner: ctx.user.id },
  });
  if (authError || !data.user) return failure("QA-Testkonto konnte nicht erstellt werden.");
  const token = randomBytes(32).toString("hex");
  const { error } = await admin.from("invites").insert({
    club_id: QA_CLUB_ID, role: "member", token, invited_by: ctx.user.id,
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  });
  if (error) {
    await admin.auth.admin.deleteUser(data.user.id);
    return failure("Testeinladung konnte nicht erstellt werden.");
  }
  return { error: "", email, password, joinPath: `/join?token=${token}` };
}
