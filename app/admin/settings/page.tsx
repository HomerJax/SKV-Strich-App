import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import ClubSettingsCard from "@/components/admin/settings/ClubSettingsCard";
import SeasonSettingsCard from "@/components/admin/settings/SeasonSettingsCard";
import TeamGeneratorSettingsCard from "@/components/admin/settings/TeamGeneratorSettingsCard";
import { CategorySettingsSection } from "@/components/admin/settings/CategorySettingsSection";
import { getServerI18n } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/config";

type PageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
    message?: string;
    club_saved?: string;
    club_error?: string;
    season_message?: string;
    season_error?: string;
  }>;
};

type ClubSettingsRow = {
  default_locale: string | null;
  use_strength: boolean | null;
  use_categories: boolean | null;
  awards_started_at: string | null;
  rsvp_deadline_minutes_before: number | null;
  require_rsvp_reason_on_absence: boolean | null;
  home_team_feed_enabled: boolean | null;
};

function LanguageSettingsCard({
  value,
  saved,
  error,
  locale,
}: {
  value: string;
  saved: boolean;
  error: string;
  locale: AppLocale;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <div className="space-y-4">
      {saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t("settings.language.saved")}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t("settings.language.error")}
        </div>
      ) : null}

      <form method="post" action="/api/admin/settings" className="space-y-4">
        <input type="hidden" name="redirect_to" value="/admin/settings" />
        <input type="hidden" name="settings_scope" value="language" />

        <label className="block rounded-[20px] border border-black/10 bg-neutral-50 p-4">
          <div className="text-sm font-semibold text-slate-950">
            {t("settings.language.label")}
          </div>
          <select
            name="default_locale"
            defaultValue={value}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
          >
            <option value="auto">{t("settings.language.auto")}</option>
            <option value="de">{t("settings.language.de")}</option>
            <option value="en">{t("settings.language.en")}</option>
          </select>
          <div className="mt-2 text-xs leading-5 text-slate-500">
            {t("settings.language.hint")}
          </div>
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {t("settings.language.save")}
        </button>
      </form>
    </div>
  );
}

function RsvpSettingsCard({
  value,
  requireReason,
  saved,
  error,
  locale,
}: {
  value: number;
  requireReason: boolean;
  saved: boolean;
  error: string;
  locale: AppLocale;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  return (
    <div className="space-y-4">
      {saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t("settings.rsvp.saved")}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t("settings.rsvp.error")}
        </div>
      ) : null}

      <form method="post" action="/api/admin/settings" className="space-y-4">
        <input type="hidden" name="redirect_to" value="/admin/settings" />
        <input type="hidden" name="settings_scope" value="rsvp" />

        <label className="block rounded-[20px] border border-black/10 bg-neutral-50 p-4">
          <div className="text-sm font-semibold text-slate-950">
            {t("settings.rsvp.deadline")}
          </div>
          <div className="mt-1 text-sm leading-6 text-slate-600">
            {t("settings.rsvp.deadlineHint")}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              name="rsvp_deadline_minutes_before"
              type="number"
              min={0}
              max={10080}
              step={15}
              defaultValue={value}
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
            />
            <span className="text-sm font-semibold text-slate-500">{t("settings.rsvp.minutesBefore")}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {t("settings.rsvp.defaultHint")}
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-[20px] border border-black/10 bg-neutral-50 p-4">
          <input
            type="checkbox"
            name="require_rsvp_reason_on_absence"
            defaultChecked={requireReason}
            className="mt-0.5 h-5 w-5 rounded border-slate-300 accent-slate-950"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-950">
              {t("settings.rsvp.reasonRequired")}
            </span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">
              {t("settings.rsvp.reasonHint")}
            </span>
          </span>
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {t("settings.rsvp.save")}
        </button>
      </form>
    </div>
  );
}

function AwardsSettingsCard({
  awardsStartedAt,
  saved,
  error,
  locale,
}: {
  awardsStartedAt: string | null;
  saved: boolean;
  error: string;
  locale: AppLocale;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const dateValue = awardsStartedAt ?? "";

  return (
    <div className="space-y-5">
      {saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t("settings.awards.saved")}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error === "invalid_awards_started_at"
            ? t("settings.awards.invalidDate")
            : t("settings.awards.error")}
        </div>
      ) : null}

      <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-4">
        <div className="text-sm font-black text-amber-950">
          {t("settings.awards.previewTitle")}
        </div>
        <p className="mt-1 text-sm leading-6 text-amber-900">
          {t("settings.awards.previewHint")}
        </p>
      </div>

      <form method="post" action="/api/admin/settings" className="space-y-4">
        <input type="hidden" name="redirect_to" value="/admin/settings" />

        <label className="block rounded-[20px] border border-black/10 bg-neutral-50 p-4">
          <div className="text-sm font-semibold text-slate-950">
            {t("settings.awards.start")}
          </div>
          <div className="mt-1 text-sm leading-6 text-slate-600">
            {t("settings.awards.startHint")}
          </div>

          <input
            type="date"
            name="awards_started_at"
            defaultValue={dateValue}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {t("settings.awards.save")}
          </button>

          {awardsStartedAt ? (
            <button
              type="submit"
              name="awards_started_at"
              value=""
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t("settings.awards.backPreview")}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function HomeFeedSettingsCard({
  enabled,
  saved,
  error,
  locale,
}: {
  enabled: boolean;
  saved: boolean;
  error: string;
  locale: AppLocale;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  return (
    <div className="space-y-4">
      {saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t("settings.home.saved")}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t("settings.home.error")}
        </div>
      ) : null}

      <form method="post" action="/api/admin/settings" className="space-y-4">
        <input type="hidden" name="redirect_to" value="/admin/settings" />
        <input type="hidden" name="settings_scope" value="home" />

        <label className="flex cursor-pointer items-start gap-3 rounded-[20px] border border-black/10 bg-neutral-50 p-4">
          <input
            type="checkbox"
            name="home_team_feed_enabled"
            defaultChecked={enabled}
            className="mt-0.5 h-5 w-5 rounded border-slate-300 accent-slate-950"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-950">
              {t("settings.home.feedLabel")}
            </span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">
              {t("settings.home.feedHint")}
            </span>
          </span>
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {t("settings.home.save")}
        </button>
      </form>
    </div>
  );
}

function SettingsShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-[24px] border border-black/10 bg-white shadow-sm">
      <summary className="list-none cursor-pointer px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-slate-950">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>

          <div className="mt-0.5 shrink-0 rounded-full border border-black/10 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 transition group-open:rotate-180">
            ⌄
          </div>
        </div>
      </summary>

      <div className="border-t border-black/10 px-5 py-5">{children}</div>
    </details>
  );
}

export default async function AdminSettingsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const { locale, t } = await getServerI18n();
  const { clubId, membership, isPowerUser } = await requireClub();

  const hasAdminAccess = canManageClub({
    isPowerUser,
    role: membership.role,
  });

  if (!hasAdminAccess) {
    redirect("/admin");
  }

  const supabase = await createClient();

  const [{ data: settingsData }, { data: categoriesData }] = await Promise.all([
    supabase
      .from("club_settings")
      .select("default_locale, use_strength, use_categories, awards_started_at, rsvp_deadline_minutes_before, require_rsvp_reason_on_absence, home_team_feed_enabled")
      .eq("club_id", clubId)
      .maybeSingle(),
    supabase
      .from("club_categories")
      .select("id, key, label, sort_order, is_active, is_strong")
      .eq("club_id", clubId)
      .order("sort_order", { ascending: true }),
  ]);

  const settings = (settingsData as ClubSettingsRow | null) ?? null;
  const categories = categoriesData ?? [];

  const clubSaved =
    resolvedSearchParams?.club_saved === "1" ||
    resolvedSearchParams?.saved === "1";
  const clubError =
    resolvedSearchParams?.club_error ?? resolvedSearchParams?.error ?? "";

  const seasonMessage =
    resolvedSearchParams?.season_message ?? resolvedSearchParams?.message ?? "";
  const seasonError =
    resolvedSearchParams?.season_error ?? resolvedSearchParams?.error ?? "";

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
        <div className="flex items-center">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← {t("settings.page.backAdmin")}
          </Link>
        </div>

        <div className="rounded-[24px] border border-black/10 bg-white px-5 py-5 shadow-sm">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
            {t("settings.page.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {t("settings.page.description")}
          </p>

          {isPowerUser ? (
            <div className="mt-4 inline-flex rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-900">
              {t("settings.page.powerUser")}
            </div>
          ) : null}
        </div>

        <SettingsShell title={t("settings.section.club")} description={t("settings.section.clubHint")}>
          <ClubSettingsCard saved={clubSaved} error={clubError} />
        </SettingsShell>

        <SettingsShell
          title={t("settings.language.title")}
          description={t("settings.language.description")}
        >
          <LanguageSettingsCard
            value={settings?.default_locale ?? "auto"}
            saved={clubSaved}
            error={clubError}
            locale={locale}
          />
        </SettingsShell>

        <SettingsShell title={t("settings.section.home")} description={t("settings.section.homeHint")}>
          <HomeFeedSettingsCard
            enabled={settings?.home_team_feed_enabled === true}
            saved={clubSaved}
            error={clubError}
            locale={locale}
          />
        </SettingsShell>

        <SettingsShell title={t("settings.section.seasons")} description={t("settings.section.seasonsHint")}>
          <SeasonSettingsCard message={seasonMessage} error={seasonError} />
        </SettingsShell>

        <SettingsShell title={t("settings.section.categories")} description={t("settings.section.categoriesHint")}>
          <CategorySettingsSection
            categories={categories}
            useCategories={settings?.use_categories ?? false}
          />
        </SettingsShell>

        <SettingsShell title={t("settings.section.generator")} description={t("settings.section.generatorHint")}>
          <TeamGeneratorSettingsCard
            useStrength={settings?.use_strength ?? false}
            useCategories={settings?.use_categories ?? false}
          />
        </SettingsShell>

        <SettingsShell title={t("settings.section.rsvp")} description={t("settings.section.rsvpHint")}>
          <RsvpSettingsCard
            value={settings?.rsvp_deadline_minutes_before ?? 60}
            requireReason={settings?.require_rsvp_reason_on_absence === true}
            saved={clubSaved}
            error={clubError}
            locale={locale}
          />
        </SettingsShell>

        <SettingsShell title={t("settings.section.awards")} description={t("settings.section.awardsHint")}>
          <AwardsSettingsCard
            awardsStartedAt={settings?.awards_started_at ?? null}
            saved={clubSaved}
            error={clubError}
            locale={locale}
          />
        </SettingsShell>
      </section>
    </main>
  );
}
