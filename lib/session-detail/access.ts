import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/context";

export type SessionRow = {
  id: number;
  date: string;
  notes: string | null;
  winner_photo_path: string | null;
  club_id: string;
};

type SessionAccessMembership = {
  club_id: string;
  role: string;
};

function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Service Role Client konnte nicht erstellt werden: fehlende Supabase ENV Variablen."
    );
  }

  return createAdminClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function requireSessionAccess(sessionId: number) {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    return { error: "Nicht eingeloggt.", status: 401 as const };
  }

  if (!ctx.player && !ctx.isPowerUser) {
    return { error: "Onboarding unvollständig.", status: 403 as const };
  }

  if (!ctx.activeClubId) {
    return { error: "Kein aktiver Club gewählt.", status: 403 as const };
  }

  if (!ctx.memberships.length && !ctx.isPowerUser) {
    return { error: "Kein aktiver Club gewählt.", status: 403 as const };
  }

  const membership: SessionAccessMembership | null =
    ctx.memberships.find((m) => m.club_id === ctx.activeClubId) ??
    (ctx.isPowerUser
      ? {
          club_id: ctx.activeClubId,
          role: "power_user",
        }
      : null);

  if (!membership) {
    return {
      error: "Keine gültige Club-Mitgliedschaft gefunden.",
      status: 403 as const,
    };
  }

  const userSupabase = await createClient();

  const { data: sessionData, error: sessionError } = await userSupabase
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

  const adminSupabase = createServiceRoleClient();

  return {
    supabase: userSupabase,
    adminSupabase,
    clubId: ctx.activeClubId,
    membership,
    isPowerUser: ctx.isPowerUser,
    session: sessionData as SessionRow,
  };
}