import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePowerUser } from "@/lib/auth/power-user";
import {
  FEATURE_FLAG_DEFINITIONS,
  type FeatureFlagKey,
  setFeatureFlagForAllClubs,
  setFeatureFlagForClub,
} from "@/lib/feature-flags";
import { getServerI18n } from "@/lib/i18n/server";

type ClubRow = {
  id: string;
  name: string | null;
  display_name: string | null;
  created_at: string | null;
};

type FlagRow = {
  club_id: string;
  feature_key: string;
  enabled: boolean;
};

function getClubLabel(club: ClubRow) {
  return (
    club.display_name?.trim() ||
    club.name?.trim() ||
    `Club ${club.id.slice(0, 8)}`
  );
}

export default async function PowerUserFlagsPage() {
  await requirePowerUser();
  const { t } = await getServerI18n();

  const getFlagTitle = (key: FeatureFlagKey, fallback: string) =>
    key === "hall_of_fame_badges" ? t("powerFlags.badgesTitle") : fallback;
  const getFlagDescription = (key: FeatureFlagKey, fallback: string) =>
    key === "hall_of_fame_badges" ? t("powerFlags.badgesDescription") : fallback;

  const supabase = await createClient();
  const managedKeys = FEATURE_FLAG_DEFINITIONS.map((flag) => flag.key);

  const [clubsResult, flagsResult] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, name, display_name, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("club_feature_flags")
      .select("club_id, feature_key, enabled")
      .in("feature_key", managedKeys),
  ]);

  if (clubsResult.error) {
    throw new Error(t("powerFlags.clubLoadFailed", { error: clubsResult.error.message }));
  }

  if (flagsResult.error) {
    throw new Error(t("powerFlags.flagsLoadFailed", { error: flagsResult.error.message }));
  }

  const clubs = (clubsResult.data ?? []) as ClubRow[];
  const rows = (flagsResult.data ?? []) as FlagRow[];

  const enabledByClub = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.enabled) continue;
    const current = enabledByClub.get(row.club_id) ?? new Set<string>();
    current.add(row.feature_key);
    enabledByClub.set(row.club_id, current);
  }

  async function toggleFlagAction(formData: FormData) {
    "use server";

    await requirePowerUser();
    const { t } = await getServerI18n();

    const clubId = String(formData.get("club_id") ?? "").trim();
    const featureKey = String(formData.get("feature_key") ?? "").trim() as FeatureFlagKey;
    const enabled = formData.get("enabled") === "1";

    if (!clubId || !managedKeys.includes(featureKey)) {
      throw new Error(t("powerFlags.invalidCall"));
    }

    await setFeatureFlagForClub(clubId, featureKey, enabled);
    revalidatePath("/power-user/flags");
    revalidatePath("/power-user");
  }

  async function toggleFlagForAllAction(formData: FormData) {
    "use server";

    await requirePowerUser();
    const { t } = await getServerI18n();

    const featureKey = String(formData.get("feature_key") ?? "").trim() as FeatureFlagKey;
    const enabled = formData.get("enabled") === "1";

    if (!managedKeys.includes(featureKey)) {
      throw new Error(t("powerFlags.invalidKey"));
    }

    await setFeatureFlagForAllClubs(featureKey, enabled);
    revalidatePath("/power-user/flags");
    revalidatePath("/power-user");
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-5 pb-20">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href="/power-user"
          className="inline-flex items-center rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900"
        >
          ← Power User
        </Link>
        <Link
          href="/admin"
          className="inline-flex items-center rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900"
        >
          Admin
        </Link>
      </div>

      <section className="mb-4 rounded-3xl border border-black/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Power User
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              Feature Flags
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            {t("powerFlags.summary", { clubs: clubs.length, flags: FEATURE_FLAG_DEFINITIONS.length })}
          </p>
        </div>
      </section>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        {FEATURE_FLAG_DEFINITIONS.map((flag) => {
          const activeClubs = clubs.filter((club) =>
            enabledByClub.get(club.id)?.has(flag.key)
          );

          return (
            <section
              key={flag.key}
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-extrabold text-slate-950">{getFlagTitle(flag.key, flag.title)}</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {getFlagDescription(flag.key, flag.description)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-950 px-2.5 py-1 text-xs font-bold text-white">
                  {activeClubs.length}/{clubs.length}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {activeClubs.length > 0 ? (
                  activeClubs.map((club) => (
                    <span
                      key={club.id}
                      className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200"
                    >
                      {getClubLabel(club)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">{t("powerFlags.noneActive")}</span>
                )}
              </div>

              <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                <form action={toggleFlagForAllAction}>
                  <input type="hidden" name="feature_key" value={flag.key} />
                  <input type="hidden" name="enabled" value="1" />
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white"
                  >
                    {t("powerFlags.allOn")}
                  </button>
                </form>
                <form action={toggleFlagForAllAction}>
                  <input type="hidden" name="feature_key" value={flag.key} />
                  <input type="hidden" name="enabled" value="0" />
                  <button
                    type="submit"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    {t("powerFlags.allOff")}
                  </button>
                </form>
              </div>
            </section>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="font-extrabold text-slate-950">{t("powerFlags.overviewTitle")}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {t("powerFlags.overviewDescription")}
          </p>
        </div>

        {clubs.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">{t("powerFlags.noClubs")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Club</th>
                  {FEATURE_FLAG_DEFINITIONS.map((flag) => (
                    <th key={flag.key} className="px-3 py-3 text-center">
                      {getFlagTitle(flag.key, flag.title)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clubs.map((club) => (
                  <tr key={club.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {getClubLabel(club)}
                    </td>
                    {FEATURE_FLAG_DEFINITIONS.map((flag) => {
                      const enabled = enabledByClub.get(club.id)?.has(flag.key) ?? false;
                      return (
                        <td key={flag.key} className="px-3 py-2 text-center">
                          <form action={toggleFlagAction} className="inline-flex">
                            <input type="hidden" name="club_id" value={club.id} />
                            <input type="hidden" name="feature_key" value={flag.key} />
                            <input type="hidden" name="enabled" value={enabled ? "0" : "1"} />
                            <button
                              type="submit"
                              aria-label={t(enabled ? "powerFlags.disableAria" : "powerFlags.enableAria", { flag: getFlagTitle(flag.key, flag.title), club: getClubLabel(club) })}
                              className={[
                                "inline-flex min-w-20 items-center justify-center rounded-full px-3 py-1.5 text-xs font-extrabold transition",
                                enabled
                                  ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                                  : "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
                              ].join(" ")}
                            >
                              {enabled ? t("powerFlags.on") : t("powerFlags.off")}
                            </button>
                          </form>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
