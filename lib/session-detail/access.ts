import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/context";

export type SessionRow = {
  id: number;
  date: string;
  notes: string | null;
  winner_photo_path: string | null;
  club_id: string;
};

export async function requireSessionAccess(sessionId: number) {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    return { error: "Nicht eingeloggt.", status: 401 as const };
  }

  if (!ctx.player) {
    return { error: "Onboarding unvollständig.", status: 403 as const };
  }

  if (!ctx.memberships.length || !ctx.activeClubId) {
    return { error: "Kein aktiver Club gewählt.", status: 403 as const };
  }

  const membership =
    ctx.memberships.find((m) => m.club_id === ctx.activeClubId) ?? null;

  if (!membership) {
    return {
      error: "Keine gültige Club-Mitgliedschaft gefunden.",
      status: 403 as const,
    };
  }

  const supabase = await createClient();

  const { data: sessionData, error: sessionError } = await supabase
    .from("sessions")
    .select("id, date, notes, winner_photo_path, club_id")
    .eq("id", sessionId)
    .eq("club_id", ctx.activeClubId)
    .maybeSingle();

  if (sessionError) {
    return { error: sessionError.message, status: 500 as const };
  }

  if (!sessionData) {
    return { error: "Session nicht gefunden.", status: 404 as const };
  }

  return {
    supabase,
    clubId: ctx.activeClubId,
    membership,
    session: sessionData as SessionRow,
  };
}