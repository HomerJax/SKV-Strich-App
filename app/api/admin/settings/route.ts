import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type MembershipRow = {
  club_id: string;
  role: "admin" | "member";
};

type RoleRow = {
  is_power_user: boolean;
};

type ClubSettingsRow = {
  club_id: string;
  use_strength: boolean | null;
  use_categories: boolean | null;
  season_start_day: number | null;
  season_start_month: number | null;
  season_end_day: number | null;
  season_end_month: number | null;
  season_year_mode: string | null;
  awards_started_at: string | null;
};

function redirectWithParams(
  request: Request,
  redirectTo: string,
  params: Record<string, string>
) {
  const url = new URL(redirectTo || "/admin/settings", request.url);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url, { status: 303 });
}

function parseInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return NaN;
  return Number.parseInt(value, 10);
}

function parseBoolean(value: FormDataEntryValue | null) {
  if (value == null) return false;

  const normalized = String(value).trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "on" ||
    normalized === "yes"
  );
}

function hasField(formData: FormData, fieldName: string) {
  return formData.has(fieldName);
}

function isValidDay(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 31;
}

function isValidMonth(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 12;
}

function isValidYearMode(value: string) {
  return value === "start_year" || value === "end_year";
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!trimmed) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return "invalid";
  }

  const date = new Date(`${trimmed}T12:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return "invalid";
  }

  return trimmed;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const activeClubIdFromCookie = cookieStore.get("active_club_id")?.value ?? null;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const formData = await request.formData();
  const redirectTo = String(formData.get("redirect_to") ?? "/admin/settings").trim();

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/admin/settings", request.url), {
      status: 303,
    });
  }

  const [
    { data: membershipsData, error: membershipsError },
    { data: roleRow, error: roleError },
  ] = await Promise.all([
    supabase
      .from("club_memberships")
      .select("club_id, role")
      .eq("user_id", user.id),
    supabase
      .from("user_roles")
      .select("is_power_user")
      .eq("user_id", user.id)
      .maybeSingle<RoleRow>(),
  ]);

  if (membershipsError || roleError) {
    return redirectWithParams(request, redirectTo, { error: "unauthorized" });
  }

  const memberships = (membershipsData ?? []) as MembershipRow[];
  const isPowerUser = roleRow?.is_power_user === true;

  if (!isPowerUser && memberships.length === 0) {
    return NextResponse.redirect(new URL("/waiting-for-invite", request.url), {
      status: 303,
    });
  }

  let activeClubId: string | null = null;

  if (isPowerUser) {
    if (!activeClubIdFromCookie) {
      return NextResponse.redirect(new URL("/select-club", request.url), {
        status: 303,
      });
    }

    const { data: clubData, error: clubError } = await supabase
      .from("clubs")
      .select("id")
      .eq("id", activeClubIdFromCookie)
      .maybeSingle<{ id: string }>();

    if (clubError || !clubData) {
      return NextResponse.redirect(new URL("/select-club", request.url), {
        status: 303,
      });
    }

    activeClubId = clubData.id;
  } else {
    const validClubIds = new Set(memberships.map((m) => m.club_id));

    activeClubId =
      memberships.length === 1
        ? memberships[0].club_id
        : activeClubIdFromCookie && validClubIds.has(activeClubIdFromCookie)
          ? activeClubIdFromCookie
          : null;

    if (!activeClubId) {
      return NextResponse.redirect(new URL("/select-club", request.url), {
        status: 303,
      });
    }

    const membership =
      memberships.find((m) => m.club_id === activeClubId) ?? null;

    if (!membership || membership.role !== "admin") {
      return redirectWithParams(request, redirectTo, { error: "unauthorized" });
    }
  }

  const settingsScope = String(formData.get("settings_scope") ?? "").trim();

  const submitsTeamGeneratorSettings =
    settingsScope === "team_generator" ||
    hasField(formData, "use_strength") ||
    hasField(formData, "use_categories");

  const submitsSeasonSettings =
    hasField(formData, "season_start_day") ||
    hasField(formData, "season_start_month") ||
    hasField(formData, "season_end_day") ||
    hasField(formData, "season_end_month") ||
    hasField(formData, "season_year_mode");

  const submitsAwardSettings = hasField(formData, "awards_started_at");

  if (!submitsTeamGeneratorSettings && !submitsSeasonSettings && !submitsAwardSettings) {
    return redirectWithParams(request, redirectTo, { error: "nothing_to_save" });
  }

  const { data: existingSettings, error: existingSettingsError } = await supabase
    .from("club_settings")
    .select(
      "club_id, use_strength, use_categories, season_start_day, season_start_month, season_end_day, season_end_month, season_year_mode, awards_started_at"
    )
    .eq("club_id", activeClubId)
    .maybeSingle<ClubSettingsRow>();

  if (existingSettingsError) {
    return redirectWithParams(request, redirectTo, { error: "save_failed" });
  }

  const currentSettings: ClubSettingsRow = existingSettings ?? {
    club_id: activeClubId,
    use_strength: true,
    use_categories: false,
    season_start_day: 1,
    season_start_month: 1,
    season_end_day: 31,
    season_end_month: 12,
    season_year_mode: "start_year",
    awards_started_at: null,
  };

  const useStrength = submitsTeamGeneratorSettings
    ? parseBoolean(formData.get("use_strength"))
    : (currentSettings.use_strength ?? true);

  const useCategories = submitsTeamGeneratorSettings
    ? parseBoolean(formData.get("use_categories"))
    : (currentSettings.use_categories ?? false);

  const rawSeasonStartDay = parseInteger(formData.get("season_start_day"));
  const rawSeasonStartMonth = parseInteger(formData.get("season_start_month"));
  const rawSeasonEndDay = parseInteger(formData.get("season_end_day"));
  const rawSeasonEndMonth = parseInteger(formData.get("season_end_month"));
  const rawSeasonYearMode = formData.get("season_year_mode");

  const seasonStartDay = submitsSeasonSettings
    ? rawSeasonStartDay
    : (currentSettings.season_start_day ?? 1);

  const seasonStartMonth = submitsSeasonSettings
    ? rawSeasonStartMonth
    : (currentSettings.season_start_month ?? 1);

  const seasonEndDay = submitsSeasonSettings
    ? rawSeasonEndDay
    : (currentSettings.season_end_day ?? 31);

  const seasonEndMonth = submitsSeasonSettings
    ? rawSeasonEndMonth
    : (currentSettings.season_end_month ?? 12);

  const seasonYearMode = submitsSeasonSettings
    ? (typeof rawSeasonYearMode === "string" ? rawSeasonYearMode : "")
    : (currentSettings.season_year_mode ?? "start_year");

  if (!isValidDay(seasonStartDay)) {
    return redirectWithParams(request, redirectTo, { error: "invalid_season_start_day" });
  }

  if (!isValidMonth(seasonStartMonth)) {
    return redirectWithParams(request, redirectTo, { error: "invalid_season_start_month" });
  }

  if (!isValidDay(seasonEndDay)) {
    return redirectWithParams(request, redirectTo, { error: "invalid_season_end_day" });
  }

  if (!isValidMonth(seasonEndMonth)) {
    return redirectWithParams(request, redirectTo, { error: "invalid_season_end_month" });
  }

  if (!isValidYearMode(seasonYearMode)) {
    return redirectWithParams(request, redirectTo, { error: "invalid_season_year_mode" });
  }

  const parsedAwardsStartedAt = submitsAwardSettings
    ? parseOptionalDate(formData.get("awards_started_at"))
    : currentSettings.awards_started_at;

  if (parsedAwardsStartedAt === "invalid") {
    return redirectWithParams(request, redirectTo, { error: "invalid_awards_started_at" });
  }

  const awardsStartedAt =
    submitsAwardSettings ? parsedAwardsStartedAt : currentSettings.awards_started_at;

  const { error: upsertError } = await supabase.from("club_settings").upsert(
    {
      club_id: activeClubId,
      use_strength: useStrength,
      use_categories: useCategories,
      season_start_day: seasonStartDay,
      season_start_month: seasonStartMonth,
      season_end_day: seasonEndDay,
      season_end_month: seasonEndMonth,
      season_year_mode: seasonYearMode,
      awards_started_at: awardsStartedAt,
    },
    {
      onConflict: "club_id",
    }
  );

  if (upsertError) {
    return redirectWithParams(request, redirectTo, { error: "save_failed" });
  }

  const savedRedirectTo =
    submitsTeamGeneratorSettings &&
    !useCategories &&
    redirectTo.includes("/club-setup") &&
    redirectTo.includes("step=categories")
      ? "/club-setup?created=1&step=done"
      : redirectTo;

  return redirectWithParams(request, savedRedirectTo, { saved: "1" });
}