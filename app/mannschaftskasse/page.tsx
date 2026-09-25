import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCashboxAccess } from "@/lib/cashbox/access";
import { formatCents, parseEuroToCents } from "@/lib/cashbox/money";
import { createClient } from "@/lib/supabase/server";
import { reportPenaltyAction } from "./actions";
import BeerCheckoutCard from "./BeerCheckoutCard";
import { getServerI18n } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/config";

type Props = {
  searchParams?: Promise<{ saved?: string; error?: string; beer_error?: string; beer_saved?: string; setup_saved?: string }>;
};

type Player = {
  id: number;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
};

type Penalty = {
  id: number;
  player_id: number;
  reason: string | null;
  type: "beer" | "money" | "custom";
  value: string | null;
  created_at: string;
  due_date: string | null;
  resolved_at: string | null;
  escalation_value: string | null;
};

type Rule = {
  rule_key: string;
  label: string;
  value: string;
  enabled: boolean;
};

type Transaction = {
  id: number;
  amount_cents: number;
  title: string;
  category: string;
  occurred_on: string;
};

type Contribution = {
  id: number;
  title: string;
  amount_cents: number;
  due_date: string | null;
  archived_at: string | null;
};

type ContributionMember = {
  contribution_id: number;
  player_id: number;
  status: "open" | "paid" | "exempt";
};

type BeerConsumption = {
  id: number;
  player_id: number;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  payment_method: "paypal" | "cash";
  payment_status: "pending" | "paid" | "cancelled";
  created_at: string;
};

function playerName(player: Player, locale: AppLocale) {
  return (
    player.nickname?.trim() ||
    [player.first_name, player.last_name].filter(Boolean).join(" ") ||
    player.name ||
    translate(locale, "cashbox.playerFallback", { id: player.id })
  );
}

function fmtDate(value: string | null | undefined, locale: AppLocale) {
  if (!value) return "–";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(
    locale === "de" ? "de-DE" : "en-GB",
  );
}

function beerBadge(total: number, locale: AppLocale) {
  if (total >= 100) return translate(locale, "cashbox.beerBadge100");
  if (total >= 50) return translate(locale, "cashbox.beerBadge50");
  if (total >= 20) return translate(locale, "cashbox.beerBadge20");
  if (total >= 6) return translate(locale, "cashbox.beerBadge6");
  if (total >= 1) return translate(locale, "cashbox.beerBadge1");
  return null;
}

export default async function Page({ searchParams }: Props) {
  const { locale, t } = await getServerI18n();
  const q = await searchParams;
  const access = await requireCashboxAccess();
  const { clubId, player, canManageCashbox, canManageBeer, isClubAdmin } = access;
  const supabase = await createClient();

  const [
    { data: playersData },
    { data: penaltiesData },
    { data: settings },
    { data: rulesData },
    { data: transactionsData },
    { data: contributionsData },
    { data: contributionMembersData },
    { data: beerConsumptionsData },
  ] = await Promise.all([
    supabase
      .from("players")
      .select("id,name,first_name,last_name,nickname")
      .eq("club_id", clubId)
      .eq("is_guest", false)
      .eq("is_active", true)
      .order("first_name"),
    supabase
      .from("penalties")
      .select("id,player_id,reason,type,value,created_at,due_date,resolved_at,escalation_value")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false }),
    supabase
      .from("club_settings")
      .select("cashbox_setup_completed,cashbox_penalties_enabled,cashbox_contributions_enabled,beerkasse_premium_enabled,beerkasse_enabled,beerkasse_paypal_url,beerkasse_price_cents,beerkasse_stats_enabled,beerkasse_badges_enabled")
      .eq("club_id", clubId)
      .maybeSingle(),
    supabase
      .from("penalty_rules")
      .select("rule_key,label,value,enabled")
      .eq("club_id", clubId)
      .eq("enabled", true)
      .order("sort_order"),
    supabase
      .from("cash_transactions")
      .select("id,amount_cents,title,category,occurred_on")
      .eq("club_id", clubId)
      .order("occurred_on", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("cash_contributions")
      .select("id,title,amount_cents,due_date,archived_at")
      .eq("club_id", clubId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("cash_contribution_members")
      .select("contribution_id,player_id,status")
      .eq("club_id", clubId),
    supabase
      .from("beer_consumptions")
      .select("id,player_id,quantity,unit_price_cents,total_cents,payment_method,payment_status,created_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false }),
  ]);

  if (settings?.cashbox_setup_completed !== true) {
    if (isClubAdmin) redirect("/mannschaftskasse/setup");
    return <main className="min-h-screen bg-neutral-100"><section className="mx-auto max-w-3xl space-y-4 px-4 py-6"><Link href="/home" className="text-sm font-semibold text-slate-600">← Home</Link><div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"><div className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-700">{t("cashbox.title")}</div><h1 className="mt-2 text-2xl font-black text-slate-950">{t("cashbox.notSetUp")}</h1><p className="mt-2 text-sm font-medium leading-6 text-slate-600">{t("cashbox.notSetUpText")}</p></div></section></main>;
  }
  const penaltiesEnabled = settings.cashbox_penalties_enabled === true;
  const contributionsEnabled = settings.cashbox_contributions_enabled === true;

  const players = (playersData ?? []) as Player[];
  const penalties = (penaltiesData ?? []) as Penalty[];
  const rules = (rulesData ?? []) as Rule[];
  const transactions = (transactionsData ?? []) as Transaction[];
  const contributions = (contributionsData ?? []) as Contribution[];
  const contributionMembers = (contributionMembersData ?? []) as ContributionMember[];
  const beerConsumptions = (beerConsumptionsData ?? []) as BeerConsumption[];
  const activeBeerConsumptions = beerConsumptions.filter(
    (entry) => entry.payment_status !== "cancelled",
  );
  const names = new Map(players.map((entry) => [entry.id, playerName(entry, locale)]));
  const openPenalties = penalties.filter((entry) => !entry.resolved_at);
  const mine = player
    ? openPenalties.filter((entry) => entry.player_id === player.id)
    : [];
  const activeContributionIds = new Set(contributions.map((entry) => entry.id));
  const myContributionMembers = player
    ? contributionMembers.filter(
        (entry) =>
          entry.player_id === player.id &&
          activeContributionIds.has(entry.contribution_id),
      )
    : [];
  const myOpenContributions = myContributionMembers.filter(
    (entry) => entry.status === "open",
  );
  const myOpenContributionCents = myOpenContributions.reduce((sum, member) => {
    const contribution = contributions.find(
      (entry) => entry.id === member.contribution_id,
    );
    return sum + (contribution?.amount_cents ?? 0);
  }, 0);
  const myOpenPenaltyCents = mine.reduce((sum, entry) => {
    if (entry.type !== "money") return sum;
    const cents = parseEuroToCents(entry.value);
    return sum + (cents && cents > 0 ? cents : 0);
  }, 0);
  const beerFeatureEnabled =
    settings?.beerkasse_premium_enabled === true &&
    settings?.beerkasse_enabled === true;
  const paypalUrl = settings?.beerkasse_paypal_url?.trim() ?? "";
  const paypalEnabled = beerFeatureEnabled && Boolean(paypalUrl);
  const paypalPool = /paypal\.com\/pools?\//i.test(paypalUrl);
  const today = new Date().toISOString().slice(0, 10);
  const teamBalance = transactions.reduce(
    (sum, transaction) => sum + transaction.amount_cents,
    0,
  );
  const beerStatsEnabled =
    beerFeatureEnabled && settings?.beerkasse_stats_enabled === true;
  const beerBadgesEnabled =
    beerStatsEnabled && settings?.beerkasse_badges_enabled === true;
  const beerPriceCents = Math.max(1, Number(settings?.beerkasse_price_cents ?? 200));
  const beerTotals = new Map<number, number>();
  for (const entry of activeBeerConsumptions) {
    beerTotals.set(
      entry.player_id,
      (beerTotals.get(entry.player_id) ?? 0) + entry.quantity,
    );
  }
  const myBeerTotal = player ? beerTotals.get(player.id) ?? 0 : 0;
  const myOpenBeerCents = player
    ? activeBeerConsumptions
        .filter((entry) => entry.player_id === player.id && entry.payment_status === "pending")
        .reduce((sum, entry) => sum + entry.total_cents, 0)
    : 0;
  const myRecentBeer = player
    ? activeBeerConsumptions.filter((entry) => entry.player_id === player.id).slice(0, 5)
    : [];
  const beerLeaderboard = [...beerTotals.entries()]
    .map(([playerId, total]) => ({
      playerId,
      total,
      name: names.get(playerId) ?? t("cashbox.playerFallback", { id: playerId }),
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, locale === "de" ? "de" : "en"));

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto max-w-4xl space-y-4 px-4 py-5 pb-24">
        <div className="flex items-center justify-between gap-3">
          <Link href="/home" className="text-sm font-semibold text-slate-600">
            ← Home
          </Link>
          <div className="flex items-center gap-2">
            {isClubAdmin ? (
              <Link href="/mannschaftskasse/setup?edit=1" className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">{t("cashbox.editSetup")}</Link>
            ) : null}
            {canManageBeer && beerFeatureEnabled ? (
              <Link
                href="/mannschaftskasse/bier"
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900"
              >
                {t("cashbox.manageBeer")}
              </Link>
            ) : null}
            {canManageCashbox ? (
              <Link
                href="/admin/penalties"
                className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white"
              >
                {t("cashbox.manageCashbox")}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="rounded-[28px] bg-slate-950 p-5 text-white">
          <div className="text-[11px] font-black uppercase tracking-[.2em] text-white/45">
            {t("cashbox.teamLife")}
          </div>
          <h1 className="mt-1 text-2xl font-black">💰 {t("cashbox.title")}</h1>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/8 p-3">
              <div className="text-lg font-black">{formatCents(teamBalance)}</div>
              <div className="mt-1 text-[10px] font-bold text-white/50">{t("cashbox.balance")}</div>
            </div>
            <div className="rounded-2xl bg-white/8 p-3">
              <div className="text-lg font-black">{mine.length}</div>
              <div className="mt-1 text-[10px] font-bold text-white/50">{t("cashbox.fbzgOpen")}</div>
            </div>
            <div className="rounded-2xl bg-white/8 p-3">
              <div className="text-lg font-black">
                {formatCents(myOpenPenaltyCents + myOpenContributionCents + myOpenBeerCents)}
              </div>
              <div className="mt-1 text-[10px] font-bold text-white/50">{t("cashbox.mineOpen")}</div>
            </div>
          </div>
          <p className="mt-3 text-[11px] font-semibold leading-5 text-white/45">
            {t("cashbox.balanceHint")}
          </p>
        </div>

        {canManageCashbox ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {contributionsEnabled ? (
              <Link
                href="/admin/penalties?tab=contributions"
                className="rounded-2xl border border-blue-200 bg-blue-50 p-4"
              >
                <div className="text-sm font-black text-blue-950">{t("cashbox.manageContributions")}</div>
                <div className="mt-1 text-xs font-medium leading-5 text-blue-800/70">
                  {t("cashbox.manageContributionsHint")}
                </div>
              </Link>
            ) : null}
            {canManageBeer && beerFeatureEnabled ? (
              <Link
                href="/mannschaftskasse/bier"
                className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
              >
                <div className="text-sm font-black text-amber-950">{t("cashbox.manageBeer")}</div>
                <div className="mt-1 text-xs font-medium leading-5 text-amber-800/70">
                  {t("cashbox.manageBeerHint")}
                </div>
              </Link>
            ) : null}
          </div>
        ) : null}

        {beerFeatureEnabled && player ? (
          <BeerCheckoutCard
            priceCents={beerPriceCents}
            myTotal={myBeerTotal}
            badge={beerBadgesEnabled ? beerBadge(myBeerTotal, locale) : null}
            paypalEnabled={paypalEnabled}
            paypalPool={paypalPool}
            paypalUrl={paypalUrl}
          />
        ) : null}

        {q?.setup_saved ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{t("cashbox.setUpSaved")}</div> : null}

        {penaltiesEnabled ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold leading-5 text-slate-600 shadow-sm">
            <b className="text-slate-950">FBZG</b> = {t("cashbox.fbzgExplain")}
          </div>
        ) : null}

        {q?.beer_saved === "cash" ? (
          <div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
            {t("cashbox.beerSavedCash", { amount: formatCents(myOpenBeerCents, locale) })}
          </div>
        ) : null}

        {q?.beer_error ? (
          <div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">
            {q.beer_error}
          </div>
        ) : null}

        {beerFeatureEnabled && player ? (
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">
                  {t("cashbox.myBeerAccount")}
                </div>
                <h2 className="mt-1 text-lg font-black text-slate-950">
                  {t("cashbox.consumptionPayment")}
                </h2>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-amber-700">{formatCents(myOpenBeerCents)}</div>
                <div className="text-[10px] font-bold text-slate-500">{t("cashbox.openUnclear")}</div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {myRecentBeer.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                  <div>
                    <div className="text-sm font-black text-slate-900">{entry.quantity} 🍺 · {formatCents(entry.total_cents)}</div>
                    <div className="mt-0.5 text-[10px] font-bold text-slate-500">
                      {entry.payment_method === "cash" ? t("cashbox.cash") : "PayPal"} · {fmtDate(entry.created_at, locale)}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                    entry.payment_status === "paid"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-900"
                  }`}>
                    {entry.payment_status === "paid" ? t("cashbox.paid") : t("cashbox.open")}
                  </span>
                </div>
              ))}
              {myRecentBeer.length === 0 ? (
                <p className="text-sm text-slate-500">{t("cashbox.noBeer")}</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {beerStatsEnabled ? (
          <section className="rounded-[24px] border border-amber-100 bg-white p-5 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-amber-700">
                  {t("cashbox.beerStats")}
                </div>
                <h2 className="mt-1 text-lg font-black text-slate-950">{t("cashbox.tapSeason")}</h2>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-slate-950">{myBeerTotal}</div>
                <div className="text-[10px] font-bold text-slate-500">{t("cashbox.yourTotal")}</div>
              </div>
            </div>

            {beerBadgesEnabled && beerBadge(myBeerTotal, locale) ? (
              <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-black text-amber-900">
                {t("cashbox.yourBeerBadge", { badge: beerBadge(myBeerTotal, locale) ?? "" })}
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              {beerLeaderboard.slice(0, 10).map((entry, index) => (
                <div
                  key={entry.playerId}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-6 text-center text-xs font-black text-slate-400">
                      {index + 1}.
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-slate-900">{entry.name}</div>
                      {beerBadgesEnabled && beerBadge(entry.total, locale) ? (
                        <div className="text-[10px] font-bold text-amber-700">
                          {beerBadge(entry.total, locale)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-black text-slate-950">
                    {entry.total} 🍺
                  </div>
                </div>
              ))}
              {beerLeaderboard.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {t("cashbox.noBeerLeaderboard")}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {q?.saved ? (
          <div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
            {t("cashbox.fbzgSaved")}
          </div>
        ) : null}
        {q?.error ? (
          <div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">
            {q.error}
          </div>
        ) : null}

        <section className={contributionsEnabled ? "rounded-[24px] border bg-white p-5" : "hidden"}>
          <h2 className="text-lg font-black">{t("cashbox.myContributions")}</h2>
          <div className="mt-3 space-y-2">
            {myContributionMembers.map((member) => {
              const contribution = contributions.find(
                (entry) => entry.id === member.contribution_id,
              );
              if (!contribution) return null;
              const tone =
                member.status === "paid"
                  ? "border-emerald-200 bg-emerald-50"
                  : member.status === "exempt"
                    ? "border-slate-200 bg-slate-50"
                    : "border-amber-200 bg-amber-50";

              return (
                <div key={member.contribution_id} className={`rounded-xl border p-3 ${tone}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-black">{contribution.title}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {formatCents(contribution.amount_cents)}
                        {contribution.due_date
                          ? ` · ${t("cashbox.due", { date: fmtDate(contribution.due_date, locale) })}`
                          : ""}
                      </div>
                    </div>
                    <div className="text-xs font-black">
                      {member.status === "paid"
                        ? t("cashbox.paid")
                        : member.status === "exempt"
                          ? t("cashbox.exempt")
                          : t("cashbox.open")}
                    </div>
                  </div>
                </div>
              );
            })}
            {myContributionMembers.length === 0 ? (
              <p className="text-sm text-slate-500">{t("cashbox.noContributions")}</p>
            ) : null}
          </div>
        </section>

        <section className={penaltiesEnabled ? "rounded-[24px] border bg-white p-5" : "hidden"}>
          <h2 className="text-lg font-black">{t("cashbox.myOpenFbzg")}</h2>
          <div className="mt-3 space-y-2">
            {mine.map((entry) => {
              const escalated = Boolean(
                entry.due_date &&
                  entry.due_date <= today &&
                  entry.escalation_value,
              );
              return (
                <div key={entry.id} className="rounded-xl border p-3">
                  <div className="font-black">{entry.reason}</div>
                  <div className="text-sm text-slate-600">
                    <b>{entry.value}</b>
                    {entry.due_date ? ` · ${t("cashbox.until", { date: fmtDate(entry.due_date, locale) })}` : ""}
                  </div>
                  {escalated ? (
                    <div className="mt-1 text-xs font-black text-amber-700">
                      {t("cashbox.overdue", { value: entry.escalation_value })}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {mine.length === 0 ? (
              <p className="text-sm text-slate-500">{t("cashbox.allClear")}</p>
            ) : null}
          </div>
        </section>

        <section className={penaltiesEnabled ? "rounded-[24px] border bg-white p-5" : "hidden"}>
          <h2 className="text-lg font-black">{t("cashbox.reportFbzg")}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {t("cashbox.reportHint")}
          </p>
          <form action={reportPenaltyAction} className="mt-4 space-y-3">
            <select
              name="player_id"
              required
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
            >
              <option value="">{t("cashbox.who")}</option>
              {players.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {playerName(entry, locale)}
                </option>
              ))}
            </select>
            <select name="preset" className="w-full rounded-xl border px-3 py-2.5 text-sm">
              <option value="">{t("cashbox.customReason")}</option>
              {rules.map((rule) => (
                <option key={rule.rule_key} value={rule.rule_key}>
                  {rule.label} · {rule.value}
                </option>
              ))}
            </select>
            <div className="grid gap-2 sm:grid-cols-3">
              <input name="reason" placeholder={t("cashbox.ownReason")} className="rounded-xl border px-3 py-2.5 text-sm" />
              <select name="type" className="rounded-xl border px-3 py-2.5 text-sm">
                <option value="beer">{t("cashbox.inKind")}</option>
                <option value="money">{t("cashbox.money")}</option>
                <option value="custom">{t("cashbox.other")}</option>
              </select>
              <input name="value" placeholder={t("cashbox.valuePlaceholder")} className="rounded-xl border px-3 py-2.5 text-sm" />
            </div>
            <input name="notes" placeholder={t("cashbox.noteOptional")} className="w-full rounded-xl border px-3 py-2.5 text-sm" />
            <button className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
              {t("cashbox.reportFbzg")}
            </button>
          </form>
        </section>

        <details className="rounded-[24px] border bg-white p-5">
          <summary className="cursor-pointer font-black">{t("cashbox.recentTransactions")}</summary>
          <div className="mt-3 space-y-2">
            {transactions.slice(0, 10).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                <div>
                  <div className="text-sm font-bold">{transaction.title}</div>
                  <div className="text-[11px] text-slate-500">
                    {fmtDate(transaction.occurred_on, locale)} · {transaction.category}
                  </div>
                </div>
                <div className={`text-sm font-black ${transaction.amount_cents >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {transaction.amount_cents >= 0 ? "+" : "−"}
                  {formatCents(Math.abs(transaction.amount_cents))}
                </div>
              </div>
            ))}
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500">{t("cashbox.noTransactions")}</p>
            ) : null}
          </div>
        </details>

        <details className={penaltiesEnabled ? "rounded-[24px] border bg-white p-5" : "hidden"}>
          <summary className="cursor-pointer font-black">
            {t("cashbox.teamOpenFbzg", { count: openPenalties.length })}
          </summary>
          <div className="mt-3 space-y-2">
            {openPenalties.map((entry) => (
              <div key={entry.id} className="rounded-xl bg-slate-50 p-3">
                <b>{names.get(entry.player_id) ?? entry.player_id}</b>
                <div className="text-sm text-slate-600">
                  {entry.reason} · <b>{entry.value}</b>
                </div>
              </div>
            ))}
          </div>
        </details>
      </section>
    </main>
  );
}
