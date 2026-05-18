import { SupabaseClient } from "@supabase/supabase-js";

type BadgeUpgradePayload = {
  playerId: number;
  previousCount: number;
  newCount: number;
  previousLevel: string | null;
  newLevel: string | null;
} | null;

type LeaderboardEntry = {
  playerId: number;
  name: string;
  votes: number;
};

type CreateMvpNotificationsArgs = {
  supabase: SupabaseClient;
  clubId: string;
  sessionId: number;
  winnerPlayerId: number;
  badgeUpgrade?: BadgeUpgradePayload;
  leaderboard?: LeaderboardEntry[];
};

type PlayerRow = {
  id: number;
  user_id: string | null;
  first_name: string | null;
  nickname: string | null;
  name: string | null;
};

type SessionPlayerRow = {
  player_id: number;
  players: PlayerRow | PlayerRow[] | null;
};

function normalizePlayerRelation(player: SessionPlayerRow["players"]) {
  if (!player) return null;
  if (Array.isArray(player)) return player[0] ?? null;
  return player;
}

function getDisplayName(player: PlayerRow | null) {
  return (
    player?.nickname?.trim() ||
    player?.first_name?.trim() ||
    player?.name?.trim() ||
    "Ein Spieler"
  );
}


async function getClubShareBranding(supabase: SupabaseClient, clubId: string) {
  const { data: clubData, error: clubError } = await supabase
    .from("clubs")
    .select("display_name, logo_path")
    .eq("id", clubId)
    .maybeSingle();

  if (clubError) {
    throw new Error(`MVP notification club load failed: ${clubError.message}`);
  }

  let clubLogoUrl: string | null = null;

  const logoPath =
    typeof clubData?.logo_path === "string" && clubData.logo_path.trim()
      ? clubData.logo_path.trim()
      : null;

  if (logoPath) {
    const { data: logoData } = supabase.storage
      .from("club-logos")
      .getPublicUrl(logoPath);

    clubLogoUrl = logoData?.publicUrl ?? null;
  }

  return {
    clubName:
      typeof clubData?.display_name === "string" && clubData.display_name.trim()
        ? clubData.display_name.trim()
        : "strikr Team",
    clubLogoUrl,
  };
}

export async function createMvpNotifications({
  supabase,
  clubId,
  sessionId,
  winnerPlayerId,
  badgeUpgrade = null,
  leaderboard = [],
}: CreateMvpNotificationsArgs) {
  const clubBranding = await getClubShareBranding(supabase, clubId);

  const { data: sessionPlayers, error: playersError } = await supabase
    .from("session_players")
    .select(
      `
      player_id,
      players (
        id,
        user_id,
        first_name,
        nickname,
        name
      )
    `
    )
    .eq("session_id", sessionId);

  if (playersError) {
    throw new Error(
      `MVP notification players load failed: ${playersError.message}`
    );
  }

  const rows = (sessionPlayers ?? []) as unknown as SessionPlayerRow[];

  const normalizedRows = rows
    .map((row) => ({
      playerId: row.player_id,
      player: normalizePlayerRelation(row.players),
    }))
    .filter(
      (row): row is { playerId: number; player: PlayerRow } =>
        row.player !== null
    );

  const winnerRow = normalizedRows.find(
    (row) => row.playerId === winnerPlayerId
  );

  const winnerName = getDisplayName(winnerRow?.player ?? null);

  const notifications = normalizedRows
    .filter((row) => row.player.user_id)
    .map((row) => {
      const userId = row.player.user_id as string;
      const viewerPlayerId = row.playerId;
      const isWinner = viewerPlayerId === winnerPlayerId;

      const type = isWinner ? "mvp_winner" : "mvp_result";
      const shareVariant = isWinner ? "winner" : "team";

      return {
        user_id: userId,
        club_id: clubId,
        type,
        title: isWinner
          ? "Du wurdest zum MVP gewählt."
          : `${winnerName} wurde MVP.`,
        body: isWinner
          ? "Starker Auftritt. Teile deine MVP Card."
          : "Das MVP Voting ist beendet. Schau dir das Ergebnis an.",
        cta_href: isWinner
          ? `/sessions/${sessionId}?share=mvp`
          : `/sessions/${sessionId}?mvp=result`,
        cta_label: isWinner ? "Teilen" : "Ergebnis ansehen",
        dedupe_key: `${type}:${clubId}:${sessionId}:${userId}`,
        payload: {
          sessionId,
          clubId,
          clubName: clubBranding.clubName,
          clubLogoUrl: clubBranding.clubLogoUrl,
          winnerPlayerId,
          winnerName,
          viewerPlayerId,
          isWinner,
          shareVariant,
          shareImageUrl: `/api/share/mvp/${sessionId}/image?variant=${shareVariant}`,
          sessionHref: `/sessions/${sessionId}`,
          badgeUpgrade,
          leaderboard,
        },
      };
    });

  if (notifications.length === 0) {
    return { inserted: 0 };
  }

  const { error: insertError } = await supabase
    .from("user_notifications")
    .upsert(notifications, {
      onConflict: "dedupe_key",
      ignoreDuplicates: true,
    });

  if (insertError) {
    throw new Error(`MVP notification insert failed: ${insertError.message}`);
  }

  return { inserted: notifications.length };
}