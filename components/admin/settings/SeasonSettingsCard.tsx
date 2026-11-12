import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { getServerI18n } from "@/lib/i18n/server";
import type { AppLocale } from "@/lib/i18n/config";
import type { MessageKey } from "@/lib/i18n/messages";
import { getClubBillingAccess } from "@/lib/billing/club-billing";
import ProFeatureLock from "@/components/billing/ProFeatureLock";

type Season = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  club_id: string;
};

type SessionSummary = {
  season_id: number | null;
  date: string;
  start_time: string | null;
};

type Props = {
  error?: string;
  message?: string;
  redirectTo?: string;
  createSubmitLabel?: string;
  variant?: "default" | "onboarding";
  qaPreview?: boolean;
};

const WEEKDAY_OPTIONS: Array<{ value: string; labelKey: MessageKey }> = [
  { value: "1", labelKey: "newSession.monday" },
  { value: "2", labelKey: "newSession.tuesday" },
  { value: "3", labelKey: "newSession.wednesday" },
  { value: "4", labelKey: "newSession.thursday" },
  { value: "5", labelKey: "newSession.friday" },
  { value: "6", labelKey: "newSession.saturday" },
  { value: "0", labelKey: "newSession.sunday" },
];

function formatDate(date: string | null, locale: AppLocale, notSet: string) {
  return date
    ? new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString(
        locale === "de" ? "de-DE" : "en-GB",
      )
    : notSet;
}

function toDateInputValue(date: string | null) {
  return date?.slice(0, 10) ?? "";
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function isCurrentSeason(start: string | null, end: string | null) {
  if (!start) return false;
  const today = todayIso();
  return start.slice(0, 10) <= today && (!end || end.slice(0, 10) >= today);
}

export default async function SeasonSettingsCard({
  error = "",
  message = "",
  redirectTo = "/admin/settings",
  createSubmitLabel,
  variant = "default",
  qaPreview = false,
}: Props) {
  const { locale, t } = await getServerI18n();
  const { clubId, membership, isPowerUser } = await requireClub();

  if (!canManageClub({ isPowerUser, role: membership.role })) redirect("/admin");

  const supabase = await createClient();
  const billingAccess = await getClubBillingAccess(supabase, clubId);
  const [{ data, error: queryError }, { data: sessionData }] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name, start_date, end_date, club_id")
      .eq("club_id", clubId)
      .order("start_date", { ascending: false }),
    supabase
      .from("sessions")
      .select("season_id, date, start_time")
      .eq("club_id", clubId)
      .eq("type", "training")
      .gte("date", todayIso())
      .order("date", { ascending: true }),
  ]);

  if (queryError) throw new Error(queryError.message);

  const seasons = (qaPreview ? [{id:-1,club_id:clubId,name:"strikr Standardsaison",start_date:todayIso(),end_date:new Date(new Date(todayIso()+"T12:00:00").getTime()+364*86400000).toISOString().slice(0,10)}] : (data ?? [])) as Season[];
  const sessions = (sessionData ?? []) as SessionSummary[];
  const createLabel = createSubmitLabel ?? t("settings.season.create");

  if (variant === "onboarding") {
    const season = seasons.find(s => isCurrentSeason(s.start_date,s.end_date)) ?? seasons[0];
    return (
      <div className="min-w-0 space-y-4">
        {message ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}
        {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div> : null}
        <div className="min-w-0 rounded-[24px] border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-4 sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-700">Eure Saison · Schon vorbereitet</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">Eine Saison für eure Spiele und Statistiken</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">strikr legt beim Vereinsstart automatisch eine einjährige Saison an. Alle Trainings, Ergebnisse und Statistiken werden ihr zugeordnet. Du musst nichts zusätzlich anlegen.</p>
          {season ? <div className="mt-4 min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{qaPreview ? "Simulierte Standardsaison" : "Eure aktive Saison"}</p>
            <p className="mt-1 break-words text-lg font-black text-slate-950">{season.name}</p>
            <p className="mt-1 text-sm text-slate-600">{formatDate(season.start_date,locale,t("settings.season.notSet"))} – {season.end_date?formatDate(season.end_date,locale,t("settings.season.notSet")):t("settings.season.open")}</p>
          </div> : <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">Es wurde noch keine Saison angelegt. Bitte die Vereinsgründung prüfen, bevor du Trainings erstellst.</p>}
          <p className="mt-3 text-xs leading-5 text-slate-500">Trainingstage und Uhrzeiten folgen erst auf der nächsten Seite „Trainingsbetrieb“.</p>
        </div>
        {season && (billingAccess.isPro || qaPreview) ? <details className="group min-w-0 overflow-hidden rounded-[22px] border border-violet-200 bg-white">
          <summary className="cursor-pointer px-4 py-4 text-sm font-black text-violet-800 focus-visible:outline-offset-[-3px]">Saison-Einstellungen ändern (PRO) <span className="block pt-1 text-xs font-normal text-slate-500">Name, Startdatum und Enddatum individuell festlegen</span></summary>
          <form action="/api/admin/seasons" method="post" className="min-w-0 space-y-4 border-t border-violet-100 p-4">
            <input type="hidden" name="intent" value="update"/>
            <input type="hidden" name="season_id" value={String(season.id)}/>
            <input type="hidden" name="redirect_to" value={redirectTo}/>
            <label className="block min-w-0 text-sm font-bold text-slate-800">Saisonname<input required name="name" maxLength={100} defaultValue={season.name} className="mt-1.5 block w-full min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-950 outline-none focus:border-cyan-400"/></label>
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block min-w-0 text-sm font-bold text-slate-800">Startdatum<input required type="date" name="start_date" defaultValue={toDateInputValue(season.start_date)} className="mt-1.5 block w-full min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-2 py-3 text-base text-slate-950"/></label>
              <label className="block min-w-0 text-sm font-bold text-slate-800">Enddatum<input type="date" name="end_date" defaultValue={toDateInputValue(season.end_date)} className="mt-1.5 block w-full min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-2 py-3 text-base text-slate-950"/></label>
            </div>
            <p className="text-xs leading-5 text-slate-500">{qaPreview?"Simulation: Änderungen werden nicht gespeichert.":"Änderungen an einer Saison können die Zuordnung vorhandener Trainings beeinflussen."}</p>
            <button type="submit" className="w-full rounded-xl bg-violet-700 px-4 py-3 text-sm font-black text-white hover:bg-violet-800">Saison-Einstellungen speichern</button>
          </form>
        </details> : <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"><strong>Mit PRO:</strong> Eigener Saisonname und individueller Zeitraum. Die Standardsaison funktioniert ohne Anpassungen.</div>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        <div className="font-semibold text-slate-900">{t("settings.season.title")}</div>
        <p className="mt-1">{t("settings.season.hint")}</p>
      </div>

      {seasons.length > 0 ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-900">
            {t("settings.season.manageSeries")}
          </div>
          {seasons.map((season) => {
            const future = sessions.filter((session) => session.season_id === season.id);
            const times = Array.from(
              new Set(future.map((session) => session.start_time).filter(Boolean)),
            ) as string[];
            const timeSummary =
              times.length === 1
                ? t("settings.season.oneTime", { time: times[0] })
                : times.length > 1
                  ? t("settings.season.differentTimes", { times: times.join(", ") })
                  : t("settings.season.noStartTime");

            return (
              <div
                key={`series-${season.id}`}
                className="rounded-2xl border border-black/10 bg-white p-4"
              >
                <div className="font-semibold text-slate-900">{season.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {t("settings.season.futureTrainings", { count: future.length })} ·{" "}
                  {timeSummary}
                </div>

                {future.length > 0 ? (
                  <form
                    method="post"
                    action="/api/admin/seasons"
                    className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                  >
                    <input type="hidden" name="intent" value="update-training-time" />
                    <input type="hidden" name="season_id" value={String(season.id)} />
                    <input type="hidden" name="redirect_to" value={redirectTo} />
                    <label className="text-sm font-medium text-slate-900">
                      {t("settings.season.newStartTime")}
                      <input
                        name="start_time"
                        type="time"
                        defaultValue={times.length === 1 ? times[0] : ""}
                        required
                        className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-900">
                      {t("settings.season.changeFrom")}
                      <input
                        name="from_date"
                        type="date"
                        defaultValue={todayIso()}
                        min={todayIso()}
                        required
                        className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      {t("settings.season.changeFuture")}
                    </button>
                  </form>
                ) : (
                  <div className="mt-3 text-sm text-slate-500">
                    {t("settings.season.noFuture")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {billingAccess.isPro ? (
        <>
                <form
                  method="post"
                  action="/api/admin/seasons"
                  className="space-y-4 rounded-2xl border border-black/10 bg-neutral-50 p-4"
                >
                  <input type="hidden" name="intent" value="create" />
                  <input type="hidden" name="redirect_to" value={redirectTo} />
                  <div className="text-sm font-semibold text-slate-800">
                    {t("settings.season.newSeason")}
                  </div>
                  <label className="block text-sm font-medium text-slate-900">
                    {t("settings.season.name")}
                    <input
                      name="name"
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                      placeholder={t("settings.season.namePlaceholder")}
                      required
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium text-slate-900">
                      {t("settings.season.startDate")}
                      <input
                        name="start_date"
                        type="date"
                        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                        required
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-900">
                      {t("settings.season.endDate")}{" "}
                      <span className="font-normal text-slate-500">{t("settings.season.optional")}</span>
                      <input
                        name="end_date"
                        type="date"
                        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                      />
                    </label>
                  </div>
          
                  {<div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-900">
                      {t("settings.season.recurring")}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {t("settings.season.recurringHint")}
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {["weekday_one", "weekday_two"].map((name, index) => (
                        <label key={name} className="text-sm font-medium text-slate-900">
                          {t("settings.season.trainingDay", { number: index + 1 })}
                          <select
                            name={name}
                            defaultValue=""
                            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                          >
                            <option value="">
                              {index
                                ? t("settings.season.noSecondDay")
                                : t("settings.season.noFixedDay")}
                            </option>
                            {WEEKDAY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {t(option.labelKey)}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>}
          
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    {createLabel}
                  </button>
                </form>
          
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-slate-800">
                    {t("settings.season.existing")}
                  </div>
                  {seasons.length === 0 ? (
                    <div className="rounded-2xl border border-black/10 bg-white p-4 text-sm text-slate-500">
                      {t("settings.season.none")}
                    </div>
                  ) : (
                    seasons.map((season) => (
                      <div
                        key={season.id}
                        className="rounded-2xl border border-black/10 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-slate-900">{season.name}</div>
                              {isCurrentSeason(season.start_date, season.end_date) ? (
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                  {t("settings.season.running")}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {formatDate(
                                season.start_date,
                                locale,
                                t("settings.season.notSet"),
                              )}{" "}
                              –{" "}
                              {season.end_date
                                ? formatDate(season.end_date, locale, t("settings.season.notSet"))
                                : t("settings.season.open")}
                            </div>
                          </div>
                          <form method="post" action="/api/admin/seasons">
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="season_id" value={String(season.id)} />
                            <input type="hidden" name="redirect_to" value={redirectTo} />
                            <button type="submit" className="text-sm font-medium text-red-600">
                              {t("settings.season.delete")}
                            </button>
                          </form>
                        </div>
          
                        <details className="group mt-4 rounded-2xl border border-black/10 bg-neutral-50">
                          <summary className="list-none cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                            {t("settings.season.edit")}
                          </summary>
                          <form
                            method="post"
                            action="/api/admin/seasons"
                            className="space-y-3 border-t border-black/10 p-4"
                          >
                            <input type="hidden" name="intent" value="update" />
                            <input type="hidden" name="season_id" value={String(season.id)} />
                            <input type="hidden" name="redirect_to" value={redirectTo} />
                            <label className="block text-sm font-medium">
                              {t("settings.season.name")}
                              <input
                                name="name"
                                defaultValue={season.name}
                                required
                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
                              />
                            </label>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="text-sm font-medium">
                                {t("settings.season.startDate")}
                                <input
                                  name="start_date"
                                  type="date"
                                  defaultValue={toDateInputValue(season.start_date)}
                                  required
                                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
                                />
                              </label>
                              <label className="text-sm font-medium">
                                {t("settings.season.endDate")}
                                <input
                                  name="end_date"
                                  type="date"
                                  defaultValue={toDateInputValue(season.end_date)}
                                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
                                />
                              </label>
                            </div>
                            <button
                              type="submit"
                              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                            >
                              {t("settings.season.saveChanges")}
                            </button>
                          </form>
                        </details>
                      </div>
                    ))
                  )}
                </div>
        </>
      ) : (
        <ProFeatureLock
          clubName="dein Team"
          title="Eigene Saisons mit PRO"
          description="Im Free-Plan nutzt ihr eine laufende strikr Standard Saison. Die Trainingszeit der Serie kannst du weiterhin ändern."
          featureList={["Eigener Saisonname und Zeitraum", "Mehrere Saisons", "Saisons bearbeiten und löschen", "Vergangene Saisons verwalten"]}
          compact
        />
      )}
    </div>
  );
}
