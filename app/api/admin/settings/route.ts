import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type MembershipRow = {
  club_id: string;
  role: "admin" | "member";
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
    return redirectWithParams(request, { error: "unauthorized" });
  }

  const { data: membershipData, error: membershipError } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return redirectWithParams(request, { error: "unauthorized" });
  }

  const membership = (membershipData as MembershipRow | null) ?? null;

  if (!membership || membership.role !== "admin") {
    return redirectWithParams(request, { error: "unauthorized" });
  }

  if (!membership.club_id) {
    return redirectWithParams(request, { error: "missing_club" });
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
      club_id: membership.club_id,
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