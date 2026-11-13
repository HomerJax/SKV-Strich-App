"use server";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { requirePowerUser } from "@/lib/auth/power-user";

const QA_CLUB_ID = "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60";
const QA_EMAIL_DOMAIN = "qa.strikr.team";
function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
}
export async function createQaIdentity(): Promise<{ error: string; userId: string; email: string; password: string; joinPath: string }> {
  const ctx = await requirePowerUser();
  const failure = (error: string) => ({ error, userId: "", email: "", password: "", joinPath: "" });
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
  return { error: "", userId: data.user.id, email, password, joinPath: `/join?token=${token}` };
}

// Fail closed: only the owner's specifically marked QA account, with no player activity,
// can be removed. Never cascade-delete statistics, sessions, payments or chat history.
export async function resetQaIdentity(userId: string): Promise<{ error: string }> {
  const ctx = await requirePowerUser();
  if (!ctx.user || !/^[0-9a-f-]{36}$/i.test(userId)) return { error: "Nicht autorisiert." };
  const admin = adminClient();
  const { data: auth, error: lookupError } = await admin.auth.admin.getUserById(userId);
  const user = auth?.user;
  if (lookupError || !user || user.app_metadata?.strikr_qa !== true ||
      user.app_metadata?.strikr_qa_owner !== ctx.user.id ||
      user.app_metadata?.strikr_qa_club_id !== QA_CLUB_ID ||
      !user.email?.endsWith(`@${QA_EMAIL_DOMAIN}`)) {
    return { error: "Dieses Konto ist kein freigegebener QA-Testspieler." };
  }
  const { data: players, error: playerError } = await admin.from("players").select("id,club_id").eq("user_id", userId);
  if (playerError) return { error: "Spielerprüfung fehlgeschlagen." };
  if ((players ?? []).some((p) => p.club_id !== null && p.club_id !== QA_CLUB_ID)) {
    return { error: "Testkonto gehört zu weiteren Vereinen und kann nicht zurückgesetzt werden." };
  }
  const { data: memberships, error: membershipError } = await admin.from("club_memberships").select("club_id").eq("user_id", userId);
  if (membershipError || (memberships ?? []).some((m) => m.club_id !== QA_CLUB_ID)) {
    return { error: "Mitgliedschaftsprüfung fehlgeschlagen oder weiterer Verein vorhanden." };
  }
  const activityTables = [
    "balance_group_audit_log", "beer_consumptions", "cash_contribution_members",
    "club_chat_messages", "penalties", "penalty_wheel_spins", "player_absences",
    "player_achievements", "player_badges", "session_attendance_reviews",
    "session_event_exclusions", "session_mvp_votes", "session_players",
    "session_rsvp_first_ins", "session_rsvps", "session_team_corrections",
    "sessions", "team_players",
  ];
  for (const player of players ?? []) {
    for (const table of activityTables) {
      const columns = table === "session_mvp_votes" ? ["voted_player_id"] :
        table === "session_team_corrections" ? ["player_id", "swap_player_id"] :
        table === "sessions" ? ["mvp_winner_player_id"] : ["player_id"];
      for (const column of columns) {
        const { count, error } = await admin.from(table).select("*", { count: "exact", head: true }).eq(column, player.id);
        if (error || (count ?? 0) > 0) return { error: "Der QA-Spieler hat bereits Aktivitäten oder die Sicherheitsprüfung ist fehlgeschlagen. Kein Reset durchgeführt." };
      }
    }
  }
  // Account-related activity must also remain untouched.
  const userActivityTables = ["club_chat_messages", "team_feed_comments", "team_feed_reactions"];
  for (const table of userActivityTables) {
    const { count, error } = await admin.from(table).select("*", { count: "exact", head: true }).eq("user_id", userId);
    if (error || (count ?? 0) > 0) return { error: "QA-Konto hat bereits Beiträge. Reset aus Sicherheitsgründen abgelehnt." };
  }
  const { error: membershipDeleteError } = await admin.from("club_memberships").delete().eq("user_id", userId).eq("club_id", QA_CLUB_ID);
  if (membershipDeleteError) return { error: "Mitgliedschaft konnte nicht entfernt werden." };
  for (const player of players ?? []) {
    const { error } = await admin.from("players").delete().eq("id", player.id).eq("user_id", userId);
    if (error) return { error: "Spieler konnte nicht entfernt werden. Konto bleibt erhalten." };
  }
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return { error: "Testkonto konnte nicht entfernt werden." };
  return { error: "" };
}
