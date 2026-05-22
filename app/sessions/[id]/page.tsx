import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { isAdminRole } from "@/lib/auth/access";
import { getResultShareData } from "@/lib/share/result-share";
import {
  ensureFeatureFlagRowsForClub,
  getFeatureFlagsForClub,
} from "@/lib/feature-flags";
import SessionDetailClient from "./SessionDetailClient";
import type { Player, SessionRow } from "./session-types";

type ClubSettings = {
  use_strength: boolean;
  strength_default: number;
  use_categories: boolean;
  category_label: string | null;
  position_label: string | null;
  attack_label: string | null;
  defense_label: string | null;
  goalkeeper_label: string | null;
  use_nicknames?: boolean;
  use_field_view?: boolean;
};

type ClubRow = {
  id: string;
  primary_color: string | null;
};

type ResultRow = {
  id: number;
  team_a_id: number | null;
  team_b_id: number | null;
  goals_team_a: number | null;
  goals_team_b: number | null;
};

type TeamRow = {
  id: number;
  name: string;
};

type TeamPlayerRow = {
  team_id: number;
  player_id: number;
};

type SessionPlayerRow = {
  player_id: number;
};

type BalanceCategoryRow = {
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function getBaseUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "";

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const sessionId = resolvedParams.id;
  const baseUrl = getBaseUrl();
  const sessionUrl = `${baseUrl}/sessions/${sessionId}`;
  const shareImageUrl = `${baseUrl}/api/share/result/${sessionId}/image`;

  try {
    const data = await getResultShareData(sessionId);

    const clubName =
      typeof data.branding?.clubName === "string" && data.branding.clubName.trim()
        ? data.branding.clubName.trim()
        : "Strikr Club";

    const goalsA = Number(data.goalsA ?? 0);
    const goalsB = Number(data.goalsB ?? 0);
    const winnerLabel =
      typeof data.winnerLabel === "string" && data.winnerLabel.trim()
        ? data.winnerLabel.trim()
        : "Ergebnis in Strikr";

    const diff = Math.abs(goalsA - goalsB);

    let highlight = "⚡ Klar entschieden";
    let story = "Schau dir das Ergebnis in Strikr an.";

    if (goalsA === goalsB) {
      highlight = "🤝 Alles offen";
      story = "Zwei Teams auf Augenhöhe. Schau dir das Ergebnis in Strikr an.";
    } else if (diff >= 3) {
      highlight = "💪 Dominanter Sieg";
      story = "Klare Sache heute. Schau dir das Ergebnis in Strikr an.";
    } else if (diff === 1) {
      highlight = "😮 Knappe Kiste";
      story = "Bis zum Schluss spannend. Schau dir das Ergebnis in Strikr an.";
    }

    const title = `${winnerLabel} • ${goalsA}:${goalsB}`;
    const description = `${highlight} · ${story}`;

    return {
      title,
      description,
      alternates: {
        canonical: sessionUrl,
      },
      openGraph: {
        title,
        description,
        url: sessionUrl,
        siteName: clubName,
        type: "article",
        images: [
          {
            url: shareImageUrl,
            width: 1080,
            height: 1350,
            alt: `${clubName} – Ergebnis ${goalsA}:${goalsB}`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [shareImageUrl],
      },
    };
  } catch {
    return {
      title: "Session in Strikr",
      description: "Ergebnis, Teams und Stats in Strikr ansehen.",
      alternates: {
        canonical: sessionUrl,
      },
      openGraph: {
        title: "Session in Strikr",
        description: "Ergebnis, Teams und Stats in Strikr ansehen.",
        url: sessionUrl,
        siteName: "Strikr",
        type: "article",
        images: [
          {
            url: shareImageUrl,
            width: 1080,
            height: 1350,
            alt: "Strikr Session",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "Session in Strikr",
        description: "Ergebnis, Teams und Stats in Strikr ansehen.",
        images: [shareImageUrl],
      },
    };
  }
}

export default async function SessionDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const sessionId = Number(resolvedParams.id);
  const { clubId, membership, isPowerUser } = await requireClub();
  const supabase = await createClient();

  if (!Number.isFinite(sessionId)) {
    redirect("/sessions");
  }

  await ensureFeatureFlagRowsForClub(clubId);

  const featureFlags = await getFeatureFlagsForClub(clubId);
  const mvpVotingEnabled = featureFlags.session_mvp_voting === true;
  const useNicknames = featureFlags.use_nicknames === true;
  const useFieldView = featureFlags.use_field_view === true;
  const homeSessionRsvpEnabled = featureFlags.home_session_rsvp === true;
  const sessionTypesEnabled = featureFlags.session_types === true;

  const [
    { data: clubData, error: clubError },
    { data: settingsData, error: settingsError },
    { data: sessionData, error: sessionError },
    { data: playersData, error: playersError },
    { data: categoriesData, error: categoriesError },
    { data: sessionPlayersData, error: sessionPlayersError },
    { data: resultData, error: resultError },
    { data: teamsData, error: teamsError },
  ] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, primary_color")
      .eq("id", clubId)
      .maybeSingle<ClubRow>(),
    supabase
      .from("club_settings")
      .select(
        "use_strength, strength_default, use_categories, category_label, position_label, attack_label, defense_label, goalkeeper_label"
      )
      .eq("club_id", clubId)
      .single(),
    supabase
      .from("sessions")
      .select("id, date, notes, type, winner_photo_path, club_id")
      .eq("id", sessionId)
      .eq("club_id", clubId)
      .single(),
    supabase
      .from("players")
      .select(
        "id, name, first_name, last_name, nickname, is_active, age_group, category_key, balance_group, preferred_position, strength, is_guest, mvp_count"
      )
      .eq("club_id", clubId)
      .order("name"),
    supabase
      .from("club_categories")
      .select("key, label, sort_order, is_active")
      .eq("club_id", clubId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("session_players")
      .select("player_id")
      .eq("session_id", sessionId),
    supabase
      .from("results")
      .select("id, team_a_id, team_b_id, goals_team_a, goals_team_b")
      .eq("session_id", sessionId)
      .maybeSingle(),
    supabase
      .from("teams")
      .select("id, name")
      .eq("session_id", sessionId)
      .eq("club_id", clubId),
  ]);

  if (clubError) {
    throw new Error(`Club konnte nicht geladen werden: ${clubError.message}`);
  }

  if (settingsError) {
    throw new Error(
      `Club-Settings konnten nicht geladen werden: ${settingsError.message}`
    );
  }

  if (sessionError) {
    redirect("/sessions");
  }

  if (playersError) {
    throw new Error(
      `Spieler konnten nicht geladen werden: ${playersError.message}`
    );
  }

  if (categoriesError) {
    throw new Error(
      `Kategorien konnten nicht geladen werden: ${categoriesError.message}`
    );
  }

  if (sessionPlayersError) {
    throw new Error(
      `Session-Spieler konnten nicht geladen werden: ${sessionPlayersError.message}`
    );
  }

  if (resultError) {
    throw new Error(
      `Ergebnis konnte nicht geladen werden: ${resultError.message}`
    );
  }

  if (teamsError) {
    throw new Error(`Teams konnten nicht geladen werden: ${teamsError.message}`);
  }

  const session = sessionData as SessionRow;

  const clubSettings: ClubSettings = {
    ...(settingsData as ClubSettings),
    use_nicknames: useNicknames,
    use_field_view: useFieldView,
  };

  const players = ((playersData ?? []).filter(
    (player) => player.is_active !== false
  ) ?? []) as Player[];

  const presentIds = ((sessionPlayersData ?? []) as SessionPlayerRow[]).map(
    (row) => row.player_id
  );

  const result = (resultData ?? null) as ResultRow | null;
  const teams = (teamsData ?? []) as TeamRow[];

  const manualTeams: Record<number, "A" | "B" | null> = {};
  presentIds.forEach((playerId) => {
    manualTeams[playerId] = null;
  });

  let goalsA = "";
  let goalsB = "";
  let hasResult = false;

  const savedTeamAId =
    result?.team_a_id ??
    teams.find((team) => team.name === "Team 1")?.id ??
    null;

  const savedTeamBId =
    result?.team_b_id ??
    teams.find((team) => team.name === "Team 2")?.id ??
    null;

  const teamIds = [savedTeamAId, savedTeamBId].filter(
    (teamId): teamId is number => Number.isFinite(teamId)
  );

  if (teamIds.length > 0) {
    const { data: teamPlayersData, error: teamPlayersError } = await supabase
      .from("team_players")
      .select("team_id, player_id")
      .in("team_id", teamIds);

    if (teamPlayersError) {
      throw new Error(
        `Team-Zuordnungen konnten nicht geladen werden: ${teamPlayersError.message}`
      );
    }

    for (const teamPlayer of (teamPlayersData ?? []) as TeamPlayerRow[]) {
      if (!(teamPlayer.player_id in manualTeams)) {
        continue;
      }

      if (teamPlayer.team_id === savedTeamAId) {
        manualTeams[teamPlayer.player_id] = "A";
      }

      if (teamPlayer.team_id === savedTeamBId) {
        manualTeams[teamPlayer.player_id] = "B";
      }
    }
  }

  if (result) {
    if (result.goals_team_a != null) goalsA = String(result.goals_team_a);
    if (result.goals_team_b != null) goalsB = String(result.goals_team_b);
    hasResult = true;
  }

  const balanceCategories = ((categoriesData ?? []) as BalanceCategoryRow[])
    .filter((category) => category.is_active)
    .slice(0, 2)
    .map((category) => ({
      key: category.key,
      label: category.label,
    }));

  let winnerPhotoUrl: string | null = null;

  if (session.winner_photo_path) {
    const { data, error } = await supabase.storage
      .from("session-photos")
      .createSignedUrl(session.winner_photo_path, 60 * 60);

    if (!error) {
      winnerPhotoUrl = data?.signedUrl ?? null;
    }
  }

  return (
    <SessionDetailClient
      sessionId={sessionId}
      initialSession={session}
      initialPlayers={players}
      initialPresentIds={presentIds}
      initialManualTeams={manualTeams}
      initialClubId={clubId}
      initialIsAdmin={isPowerUser || isAdminRole(membership.role)}
      initialClubSettings={clubSettings}
      initialBalanceCategories={balanceCategories}
      initialWinnerPhotoUrl={winnerPhotoUrl}
      initialGoalsA={goalsA}
      initialGoalsB={goalsB}
      initialHasResult={hasResult}
      initialPrimaryColor={clubData?.primary_color ?? "black"}
      initialMvpVotingEnabled={mvpVotingEnabled}
      initialUseNicknames={useNicknames}
      initialUseFieldView={useFieldView}
      initialHomeSessionRsvpEnabled={homeSessionRsvpEnabled}
      initialSessionType={session.type === "event" ? "event" : "training"}
      sessionTypesEnabled={sessionTypesEnabled}
    />
  );
}