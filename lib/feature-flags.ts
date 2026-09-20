import "server-only";

import { cache } from "react";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Compatibility keys.
 *
 * Former rollout flags stay in the type/map for now so old DB rows and existing
 * call sites keep working while the product is cleaned up. Only
 * FEATURE_FLAG_DEFINITIONS below are real rollout flags shown to power users.
 */
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
  "hall_of_fame_badges",
  "use_nicknames",
  "use_field_view",
  "home_session_rsvp",
  "session_types",
  "penalties",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export type FeatureFlagDefinition = {
  key: FeatureFlagKey;
  title: string;
  description: string;
  audience: "players" | "internal" | "mixed";
};

/**
 * Only features that are genuinely still rolled out club-by-club belong here.
 * Premium access stays separate in lib/billing.
 */
export const FEATURE_FLAG_DEFINITIONS: FeatureFlagDefinition[] = [
  {
    key: "hall_of_fame_badges",
    title: "Hall of Fame & Trophäen",
    description:
      "Kontrollierter Rollout der Hall of Fame und automatischen Karriere-Trophäen. Sobald stabil, wird auch das zum Standard.",
    audience: "players",
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

function applyCoreProductDefaults(flags: ClubFeatureFlagMap) {
  // Fester strikr-Standard. Diese Funktionen dürfen nicht mehr clubweise
  // versehentlich abgeschaltet werden.
  flags.player_stats_overview = true;
  flags.player_trends = true;
  flags.team_impact = true;
  flags.use_field_view = true;
  flags.home_session_rsvp = true;
  flags.session_types = true;

  // Das alte MVP-pro-Training-Modell wird bewusst nicht mehr ausgerollt.
  // Ein späteres Halbserien-/Saison-Voting bekommt ein neues Konzept.
  flags.session_mvp_voting = false;

  // Alte/tote Rollout-Schalter bleiben aus, bis ihre Kompatibilitäts-Keys ganz
  // entfernt werden können.
  flags.best_phase = false;
  flags.new_share_cards = false;
  flags.experimental_generator = false;
  flags.founder_tools = false;

  return flags;
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

async function syncBadgesAfterEnable(clubIds: string[]) {
  if (clubIds.length === 0) return;

  const { syncClubAchievements } = await import("@/lib/badges/engine");

  for (let index = 0; index < clubIds.length; index += 4) {
    const batch = clubIds.slice(index, index + 4);
    const results = await Promise.allSettled(
      batch.map((clubId) => syncClubAchievements(clubId)),
    );

    results.forEach((result, resultIndex) => {
      if (result.status === "rejected") {
        console.error(
          `Badge sync after feature activation failed for ${batch[resultIndex]}`,
          result.reason,
        );
      }
    });
  }
}

const getFeatureFlagsForClubCached = cache(
  async (clubId: string): Promise<ClubFeatureFlagMap> => {
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

    return applyCoreProductDefaults(flags);
  }
);

export async function getFeatureFlagsForClub(
  clubId: string
): Promise<ClubFeatureFlagMap> {
  return getFeatureFlagsForClubCached(clubId);
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

  if (featureKey === "hall_of_fame_badges" && enabled) {
    await syncBadgesAfterEnable([clubId]);
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

  if (featureKey === "hall_of_fame_badges" && enabled) {
    await syncBadgesAfterEnable(clubIds);
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

  // Neue Clubs bekommen nur noch Zeilen für echte Rollout-Flags.
  const managedKeys = FEATURE_FLAG_DEFINITIONS.map((definition) => definition.key);
  const missingPayload = managedKeys
    .filter((featureKey) => !existingKeys.has(featureKey))
    .map((featureKey) => ({
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
