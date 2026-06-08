import type { SupabaseClient } from "@supabase/supabase-js";

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDefaultSeasonName(startDate: Date, endDate: Date) {
  const startYear = startDate.getUTCFullYear();
  const endYearShort = String(endDate.getUTCFullYear()).slice(-2);

  return `Saison ${startYear}/${endYearShort}`;
}

export async function ensureDefaultSeasonForClub(
  supabase: SupabaseClient,
  clubId: string
): Promise<{ created: boolean; seasonId: number | null; error: string | null }> {
  if (!clubId) {
    return {
      created: false,
      seasonId: null,
      error: "missing-club-id",
    };
  }

  const { data: existingSeason, error: existingSeasonError } = await supabase
    .from("seasons")
    .select("id")
    .eq("club_id", clubId)
    .limit(1)
    .maybeSingle<{ id: number }>();

  if (existingSeasonError) {
    return {
      created: false,
      seasonId: null,
      error: existingSeasonError.message,
    };
  }

  if (existingSeason?.id) {
    return {
      created: false,
      seasonId: existingSeason.id,
      error: null,
    };
  }

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 365);

  const { data: createdSeason, error: insertSeasonError } = await supabase
    .from("seasons")
    .insert({
      club_id: clubId,
      name: buildDefaultSeasonName(startDate, endDate),
      start_date: toDateOnly(startDate),
      end_date: toDateOnly(endDate),
    })
    .select("id")
    .single<{ id: number }>();

  if (insertSeasonError) {
    return {
      created: false,
      seasonId: null,
      error: insertSeasonError.message,
    };
  }

  return {
    created: true,
    seasonId: createdSeason.id,
    error: null,
  };
}
