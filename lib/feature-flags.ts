import "server-only";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const FEATURE_FLAG_KEYS = [
  "player_stats_overview",
  "player_trends",
  "team_impact",
  "best_month",
  "most_teammates",
  "favorite_winning_team",
  "best_phase",
  "new_share_cards",
  "experimental_generator",
  "founder_tools",
  "session_mvp_voting",
  "use_nicknames",
  "use_field_view",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export type FeatureFlagDefinition = {
  key: FeatureFlagKey;
  title: string;
  description: string;
  audience: "players" | "internal" | "mixed";
};

export const FEATURE_FLAG_DEFINITIONS: FeatureFlagDefinition[] = [
  {
    key: "player_stats_overview",
    title: "Player Stats Overview",
    description:
      "Grundstats für Spieler: Einsätze, Siege, Niederlagen, Unentschieden und Siegquote.",
    audience: "players",
  },
  {
    key: "player_trends",
    title: "Player Trends",
    description:
      "Trend, in welche Richtung sich ein Spieler entwickelt und wie stark der Ausschlag ist.",
    audience: "players",
  },
  {
    key: "team_impact",
    title: "Team Impact",
    description:
      "Zeigt, wie Teams mit diesem Spieler performen. Emotional stark, aber sensibel formulieren.",
    audience: "players",
  },
  {
    key: "best_month",
    title: "Bester Monat",
    description:
      "Hebt hervor, in welchem Monat ein Spieler besonders stark oder erfolgreich war.",
    audience: "players",
  },
  {
    key: "most_teammates",
    title: "Häufigste Mitspieler",
    description:
      "Zeigt, mit welchen Mitspielern man am häufigsten zusammen in einem Team war.",
    audience: "players",
  },
  {
    key: "favorite_winning_team",
    title: "Häufigstes Siegerteam",
    description:
      "Zeigt, mit welchen Konstellationen ein Spieler am häufigsten gewonnen hat.",
    audience: "players",
  },
  {
    key: "best_phase",
    title: "Stärkste Phase",
    description:
      "Hebt die beste Phase eines Spielers hervor, z. B. eine starke Serie über mehrere Trainings.",
    audience: "players",
  },
  {
    key: "new_share_cards",
    title: "New Share Cards",
    description:
      "Neue und schönere Share-Bilder für Ergebnisse, Aufstellungen und spätere Social-Posts.",
    audience: "mixed",
  },
  {
    key: "experimental_generator",
    title: "Experimental Generator",
    description:
      "Schaltet neue oder alternative Teamgenerator-Logik für ausgewählte Clubs frei.",
    audience: "internal",
  },
  {
    key: "founder_tools",
    title: "Founder Tools",
    description:
      "Interne Founder-Funktionen, Debug-Hilfen und erweiterte Kontrollmöglichkeiten.",
    audience: "internal",
  },
  {
    key: "session_mvp_voting",
    title: "MVP Voting nach Training",
    description:
      "Ermöglicht nach abgeschlossenen Trainingssessions ein MVP-Voting unter den anwesenden Teilnehmern. Ideal für Pilotclubs und gestaffelte Rollouts.",
    audience: "players",
  },
  {
    key: "use_nicknames",
    title: "Spitznamen anzeigen",
    description:
      "Steuert, ob im Club Spitznamen statt Vor- und Nachname angezeigt werden.",
    audience: "players",
  },
  {
    key: "use_field_view",
    title: "Spielfeldansicht",
    description:
      "Zeigt die Teamaufstellung in Trainingssessions als kompakte Spielfeldansicht statt als klassische Teamliste.",
    audience: "internal",
  },
];

export type ClubFeatureFlagRow = {
  id: number;
  club_id: string;
  feature_key: FeatureFlagKey;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type ClubFeatureFlagMap = Record<FeatureFlagKey, boolean>;

export function getDefaultFeatureFlagMap(): ClubFeatureFlagMap {
  return FEATURE_FLAG_KEYS.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {} as ClubFeatureFlagMap);
}

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Feature-Flag Admin Client konnte nicht erstellt werden: fehlende Supabase ENV Variablen."
    );
  }

  return createAdminClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getFeatureFlagsForClub(
  clubId: string
): Promise<ClubFeatureFlagMap> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("club_feature_flags")
    .select("feature_key, enabled")
    .eq("club_id", clubId);

  if (error) {
    throw new Error(`Feature Flags konnten nicht geladen werden: ${error.message}`);
  }

  const flags = getDefaultFeatureFlagMap();

  for (const row of (data ?? []) as Array<{
    feature_key: FeatureFlagKey;
    enabled: boolean;
  }>) {
    if (FEATURE_FLAG_KEYS.includes(row.feature_key)) {
      flags[row.feature_key] = Boolean(row.enabled);
    }
  }

  return flags;
}

export async function isFeatureEnabledForClub(
  clubId: string,
  featureKey: FeatureFlagKey
): Promise<boolean> {
  const flags = await getFeatureFlagsForClub(clubId);
  return flags[featureKey];
}

export async function setFeatureFlagForClub(
  clubId: string,
  featureKey: FeatureFlagKey,
  enabled: boolean
) {
  if (!FEATURE_FLAG_KEYS.includes(featureKey)) {
    throw new Error(`Ungültiger Feature-Key: ${featureKey}`);
  }

  const supabase = getServiceRoleClient();

  const { error } = await supabase.from("club_feature_flags").upsert(
    {
      club_id: clubId,
      feature_key: featureKey,
      enabled,
    },
    {
      onConflict: "club_id,feature_key",
    }
  );

  if (error) {
    throw new Error(`Feature Flag konnte nicht gespeichert werden: ${error.message}`);
  }
}

export async function setFeatureFlagForAllClubs(
  featureKey: FeatureFlagKey,
  enabled: boolean
) {
  if (!FEATURE_FLAG_KEYS.includes(featureKey)) {
    throw new Error(`Ungültiger Feature-Key: ${featureKey}`);
  }

  const supabase = getServiceRoleClient();

  const { data: clubs, error: clubsError } = await supabase
    .from("clubs")
    .select("id");

  if (clubsError) {
    throw new Error(`Clubs konnten nicht geladen werden: ${clubsError.message}`);
  }

  const clubIds = (clubs ?? [])
    .map((club) => String(club.id))
    .filter(Boolean);

  if (clubIds.length === 0) {
    return;
  }

  const payload = clubIds.map((clubId) => ({
    club_id: clubId,
    feature_key: featureKey,
    enabled,
  }));

  const { error } = await supabase.from("club_feature_flags").upsert(payload, {
    onConflict: "club_id,feature_key",
  });

  if (error) {
    throw new Error(
      `Feature Flag für alle Clubs konnte nicht gespeichert werden: ${error.message}`
    );
  }
}

export async function ensureFeatureFlagRowsForClub(clubId: string) {
  const supabase = getServiceRoleClient();

  const { data: existingRows, error: existingError } = await supabase
    .from("club_feature_flags")
    .select("feature_key")
    .eq("club_id", clubId);

  if (existingError) {
    throw new Error(
      `Vorhandene Feature Flags konnten nicht geladen werden: ${existingError.message}`
    );
  }

  const existingKeys = new Set(
    ((existingRows ?? []) as Array<{ feature_key: FeatureFlagKey }>).map(
      (row) => row.feature_key
    )
  );

  const missingPayload = FEATURE_FLAG_KEYS.filter(
    (featureKey) => !existingKeys.has(featureKey)
  ).map((featureKey) => ({
    club_id: clubId,
    feature_key: featureKey,
    enabled: false,
  }));

  if (missingPayload.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("club_feature_flags")
    .insert(missingPayload);

  if (error) {
    throw new Error(
      `Feature-Flag Startwerte konnten nicht angelegt werden: ${error.message}`
    );
  }
}