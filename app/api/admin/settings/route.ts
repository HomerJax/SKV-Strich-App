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

function redirectWithParams(
  request: Request,
  params: Record<string, string>
) {
  const url = new URL("/admin/settings", request.url);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url, { status: 303 });
}

function parseInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return NaN;
  return Number.parseInt(value, 10);
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
    return redirectWithParams(request, { error: "unauthorized" });
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
      return redirectWithParams(request, { error: "unauthorized" });
    }
  }

  const formData = await request.formData();

  const useStrength = formData.get("use_strength") === "1";
  const useCategories = formData.get("use_categories") === "1";

  const seasonStartDay = parseInteger(formData.get("season_start_day"));
  const seasonStartMonth = parseInteger(formData.get("season_start_month"));
  const seasonEndDay = parseInteger(formData.get("season_end_day"));
  const seasonEndMonth = parseInteger(formData.get("season_end_month"));

  const seasonYearModeRaw = formData.get("season_year_mode");
  const seasonYearMode =
    typeof seasonYearModeRaw === "string" ? seasonYearModeRaw : "";

  if (!isValidDay(seasonStartDay)) {
    return redirectWithParams(request, { error: "invalid_season_start_day" });
  }

  if (!isValidMonth(seasonStartMonth)) {
    return redirectWithParams(request, { error: "invalid_season_start_month" });
  }

  if (!isValidDay(seasonEndDay)) {
    return redirectWithParams(request, { error: "invalid_season_end_day" });
  }

  if (!isValidMonth(seasonEndMonth)) {
    return redirectWithParams(request, { error: "invalid_season_end_month" });
  }

  if (!isValidYearMode(seasonYearMode)) {
    return redirectWithParams(request, { error: "invalid_season_year_mode" });
  }

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
    },
    {
      onConflict: "club_id",
    }
  );

  if (upsertError) {
    return redirectWithParams(request, { error: "save_failed" });
  }

  return redirectWithParams(request, { saved: "1" });
}