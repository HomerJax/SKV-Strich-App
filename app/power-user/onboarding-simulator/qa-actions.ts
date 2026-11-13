"use server";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { requirePowerUser } from "@/lib/auth/power-user";
const QA_CLUB_ID = "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60";
export async function createQaInvite(): Promise<{ error: string; joinPath: string }> {
  const ctx = await requirePowerUser();
  if (!ctx.user) return { error: "Nicht autorisiert.", joinPath: "" };
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
  const token = randomBytes(32).toString("hex");
  const { error } = await admin.from("invites").insert({ club_id: QA_CLUB_ID, role: "member", token, invited_by: ctx.user.id, expires_at: new Date(Date.now() + 3600000).toISOString() });
  return error ? { error: "Testeinladung konnte nicht erstellt werden.", joinPath: "" } : { error: "", joinPath: `/join?token=${token}` };
}
