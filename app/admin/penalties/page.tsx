import Link from "next/link";
import { requireCashboxAccess } from "@/lib/cashbox/access";
import { formatCents, parseEuroToCents } from "@/lib/cashbox/money";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  addPenaltyAction,
  deletePenaltyAction,
  reopenPenaltyAction,
  resolvePenaltyAction,
  savePenaltyRuleAction,
} from "./actions";
import {
  addCashTransactionAction,
  addContributionAction,
  archiveContributionAction,
  reverseCashTransactionAction,
  setCashboxManagerAction,
  setContributionStatusAction,
} from "./cashbox-actions";
import { saveBeerkasseAction, setBeerkassePremiumAction } from "./beerkasse-actions";

type Props = {
  searchParams?: Promise<{
    tab?: string;
    saved?: string;
    error?: string;
    beerkasse_saved?: string;
    beerkasse_error?: string;
    kind?: string;
    category?: string;
  }>;
};

type Player = {
  id: number;
  user_id: string | null;
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
  escalation_after_days: number | null;
  escalation_value: string | null;
  cash_transaction_id: number | null;
};

type Rule = {
  rule_key: string;
  label: string;
  reason: string;
  type: "beer" | "money" | "custom";
  value: string;
  escalation_after_days: number | null;
  escalation_value: string | null;
  enabled: boolean;
};

type Transaction = {
  id: number;
  amount_cents: number;
  kind: "income" | "expense" | "reversal";
  category: string;
  title: string;
  notes: string | null;
  occurred_on: string;
  source_type: string | null;
  source_id: number | null;
  reversed_transaction_id: number | null;
  created_at: string;
};

type Contribution = {
  id: number;
  title: string;
  amount_cents: number;
  due_date: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
};

type ContributionMember = {
  contribution_id: number;
  player_id: number;
  status: "open" | "paid" | "exempt";
  paid_at: string | null;
  cash_transaction_id: number | null;
};

type CashboxManager = {
  user_id: string;
};

function playerName(player: Player) {
  return (
    player.nickname?.trim() ||
    [player.first_name, player.last_name].filter(Boolean).join(" ") ||
    player.name ||
    `Spieler ${player.id}`
  );
}

function fmtDate(value: string | null | undefined) {
  if (!value) return "–";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("de-DE");
}

function isEscalated(entry: Penalty) {
  return (
    !entry.resolved_at &&
    !!entry.escalation_value &&
    !!entry.due_date &&
    entry.due_date <= new Date().toISOString().slice(0, 10)
  );
}

function tabHref(tab: string) {
  return `/admin/penalties?tab=${tab}`;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs font-medium text-slate-500">{hint}</div> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: ContributionMember["status"] }) {
  const classes =
    status === "paid"
      ? "bg-emerald-50 text-emerald-700"
      : status === "exempt"
        ? "bg-slate-100 text-slate-600"
        : "bg-amber-50 text-amber-800";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${classes}`}>
      {status === "paid" ? "Bezahlt" : status === "exempt" ? "Befreit" : "Offen"}
    </span>
  );
}

export default async function Page({ searchParams }: Props) {
  const q = await searchParams;
  const activeTab = ["overview", "transactions", "contributions", "penalties", "rules", "settings"].includes(
    q?.tab ?? "",
  )
    ? q?.tab ?? "overview"
    : "overview";

  const access = await requireCashboxAccess({ manage: true });
  const { clubId, isClubAdmin, isPowerUser } = access;
  const supabase = createAdminClient();

  const [
    { data: playersData },
    { data: penaltiesData },
    { data: settings },
    { data: rulesData },
    { data: transactionsData },
    { data: contributionsData },
    { data: contributionMembersData },
    { data: managersData },
  ] = await Promise.all([
    supabase
      .from("players")
      .select("id,user_id,name,first_name,last_name,nickname")
      .eq("club_id", clubId)
      .eq("is_guest", false)
      .eq("is_active", true)
      .order("first_name"),
    supabase
      .from("penalties")
      .select(
        "id,player_id,reason,type,value,created_at,due_date,resolved_at,escalation_after_days,escalation_value,cash_transaction_id",
      )
      .eq("club_id", clubId)
      .order("created_at", { ascending: false }),
    supabase
      .from("club_settings")
      .select("cashbox_penalties_enabled,cashbox_contributions_enabled,beerkasse_premium_enabled,beerkasse_enabled,beerkasse_paypal_url,beerkasse_home_enabled,beerkasse_price_cents,beerkasse_stats_enabled,beerkasse_badges_enabled")
      .eq("club_id", clubId)
      .maybeSingle(),
    supabase
      .from("penalty_rules")
      .select(
        "rule_key,label,reason,type,value,escalation_after_days,escalation_value,enabled",
      )
      .eq("club_id", clubId)
      .order("sort_order"),
    supabase
      .from("cash_transactions")
      .select(
        "id,amount_cents,kind,category,title,notes,occurred_on,source_type,source_id,reversed_transaction_id,created_at",
      )
      .eq("club_id", clubId)
      .order("occurred_on", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("cash_contributions")
      .select("id,title,amount_cents,due_date,notes,archived_at,created_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false }),
    supabase
      .from("cash_contribution_members")
      .select("contribution_id,player_id,status,paid_at,cash_transaction_id")
      .eq("club_id", clubId),
    supabase
      .from("cashbox_managers")
      .select("user_id")
      .eq("club_id", clubId),
  ]);

  const players = (playersData ?? []) as Player[];
  const penalties = (penaltiesData ?? []) as Penalty[];
  const rules = (rulesData ?? []) as Rule[];
  const transactions = (transactionsData ?? []) as Transaction[];
  const contributions = (contributionsData ?? []) as Contribution[];
  const contributionMembers = (contributionMembersData ?? []) as ContributionMember[];
  const managers = (managersData ?? []) as CashboxManager[];

  const names = new Map(players.map((player) => [player.id, playerName(player)]));
  const namesByUserId = new Map(
    players
      .filter((player) => player.user_id)
      .map((player) => [player.user_id as string, playerName(player)]),
  );

  const openPenalties = penalties.filter((entry) => !entry.resolved_at);
  const resolvedPenalties = penalties.filter((entry) => entry.resolved_at);
  const activeContributions = contributions.filter((item) => !item.archived_at);
  const archivedContributions = contributions.filter((item) => item.archived_at);
  const reversedTransactionIds = new Set(
    transactions
      .map((transaction) => transaction.reversed_transaction_id)
      .filter((id): id is number => typeof id === "number"),
  );

  const balanceCents = transactions.reduce(
    (sum, transaction) => sum + transaction.amount_cents,
    0,
  );

  const openPenaltyCents = openPenalties.reduce((sum, penalty) => {
    if (penalty.type !== "money") return sum;
    const cents = parseEuroToCents(penalty.value);
    return sum + (cents && cents > 0 ? cents : 0);
  }, 0);

  const activeContributionIds = new Set(activeContributions.map((item) => item.id));
  const activeContributionMembers = contributionMembers.filter((member) =>
    activeContributionIds.has(member.contribution_id),
  );
  const openContributionCents = activeContributionMembers.reduce((sum, member) => {
    if (member.status !== "open") return sum;
    const contribution = activeContributions.find((item) => item.id === member.contribution_id);
    return sum + (contribution?.amount_cents ?? 0);
  }, 0);

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = transactions.filter((transaction) =>
    transaction.occurred_on.startsWith(monthKey),
  );
  const transactionKindFilter =
    q?.kind === "income" || q?.kind === "expense" || q?.kind === "reversal"
      ? q.kind
      : "all";
  const transactionCategoryFilter = q?.category?.trim() ?? "";
  const transactionCategories = Array.from(
    new Set(transactions.map((transaction) => transaction.category).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "de"));
  const filteredTransactions = transactions.filter((transaction) => {
    const kindMatches =
      transactionKindFilter === "all" ||
      transaction.kind === transactionKindFilter;
    const categoryMatches =
      !transactionCategoryFilter ||
      transaction.category === transactionCategoryFilter;
    return kindMatches && categoryMatches;
  });
  const monthIncome = thisMonth.reduce(
    (sum, transaction) =>
      transaction.amount_cents > 0 ? sum + transaction.amount_cents : sum,
    0,
  );
  const monthExpense = thisMonth.reduce(
    (sum, transaction) =>
      transaction.amount_cents < 0 ? sum + Math.abs(transaction.amount_cents) : sum,
    0,
  );

  const penaltiesEnabled = settings?.cashbox_penalties_enabled === true;
  const contributionsEnabled = settings?.cashbox_contributions_enabled === true;
  const tabs = ([
    ["overview", "Übersicht"],
    ["transactions", "Umsätze"],
    ["contributions", "Beiträge"],
    ["penalties", "FBZG"],
    ["rules", "Regeln"],
    ["settings", "Einstellungen"],
  ] as const).filter(([key]) =>
    key === "contributions"
      ? contributionsEnabled
      : key === "penalties" || key === "rules"
        ? penaltiesEnabled
        : true,
  );
  const visibleTab = tabs.some(([key]) => key === activeTab) ? activeTab : "overview";

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto max-w-6xl space-y-4 px-4 py-5 pb-24">
        <div className="flex items-center justify-between gap-3">
          <Link href={isClubAdmin ? "/admin" : "/mannschaftskasse"} className="text-sm font-semibold text-slate-600">
            ← Zurück
          </Link>
          <div className="flex items-center gap-2"><Link href="/mannschaftskasse/setup?edit=1" className="text-xs font-bold text-slate-500">Setup ändern</Link><Link href="/mannschaftskasse" className="text-xs font-bold text-slate-500">Spieleransicht</Link></div>
        </div>

        <div className="rounded-[28px] bg-slate-950 p-5 text-white">
          <div className="text-[11px] font-black uppercase tracking-[.2em] text-white/45">
            Teamleben · Finanzen
          </div>
          <h1 className="mt-1 text-2xl font-black">💰 Mannschaftskasse</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/65">
            Kassenstand, Beiträge, FBZG und echte Umsätze in einem System. FBZG steht für „Freiwilliger Beitrag zur Gemeinschaft“ – Kisten, Kuchen, Geldbeträge & Co. mit einem Augenzwinkern.
          </p>
          <div className="mt-4 text-3xl font-black">{formatCents(balanceCents)}</div>
          <div className="mt-1 text-xs font-semibold text-white/45">aktueller Kassenstand</div>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map(([key, label]) => (
            <Link
              key={key}
              href={tabHref(key)}
              className={[
                "whitespace-nowrap rounded-full px-4 py-2 text-xs font-black transition",
                visibleTab === key
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-600",
              ].join(" ")}
            >
              {label}
            </Link>
          ))}
        </nav>

        {q?.saved ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
            ✓ Gespeichert
          </div>
        ) : null}
        {q?.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
            {q.error}
          </div>
        ) : null}

        {visibleTab === "overview" ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Kassenstand" value={formatCents(balanceCents)} />
              <StatCard
                label="Offen"
                value={formatCents(openPenaltyCents + openContributionCents)}
                hint="FBZG + Beiträge"
              />
              <StatCard label="Einnahmen Monat" value={formatCents(monthIncome)} />
              <StatCard label="Ausgaben Monat" value={formatCents(monthExpense)} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-black uppercase tracking-[.16em] text-slate-400">
                  Forderungen
                </div>
                <h2 className="mt-1 text-lg font-black">Was noch offen ist</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-amber-50 p-4">
                    <div className="text-2xl font-black text-amber-950">{openPenalties.length}</div>
                    <div className="text-xs font-bold text-amber-700">offene FBZG</div>
                  </div>
                  <div className="rounded-2xl bg-blue-50 p-4">
                    <div className="text-2xl font-black text-blue-950">
                      {activeContributionMembers.filter((member) => member.status === "open").length}
                    </div>
                    <div className="text-xs font-bold text-blue-700">offene Beiträge</div>
                  </div>
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[.16em] text-slate-400">
                      Letzte Bewegungen
                    </div>
                    <h2 className="mt-1 text-lg font-black">Umsatzbuch</h2>
                  </div>
                  <Link href={tabHref("transactions")} className="text-xs font-black text-slate-600">
                    Alle →
                  </Link>
                </div>
                <div className="mt-4 space-y-2">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900">{transaction.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {fmtDate(transaction.occurred_on)} · {transaction.category === "Strafen" ? "FBZG" : transaction.category}
                        </div>
                      </div>
                      <div className={`shrink-0 text-sm font-black ${transaction.amount_cents >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {transaction.amount_cents >= 0 ? "+" : "−"}
                        {formatCents(Math.abs(transaction.amount_cents))}
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Noch keine Buchungen. Lege unter „Umsätze“ euren Startbestand an.
                    </p>
                  ) : null}
                </div>
              </section>
            </div>
          </>
        ) : null}

        {visibleTab === "transactions" ? (
          <>
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Neue Buchung</h2>
              <p className="mt-1 text-xs text-slate-500">
                Für Umsteiger: den aktuellen SpielerPlus-Kassenstand einmalig als „Startbestand“ eintragen.
              </p>
              <form action={addCashTransactionAction} className="mt-4 grid gap-3 sm:grid-cols-2">
                <select name="direction" className="rounded-xl border px-3 py-2.5 text-sm">
                  <option value="income">+ Einnahme</option>
                  <option value="expense">− Ausgabe</option>
                </select>
                <input name="amount" inputMode="decimal" placeholder="Betrag, z. B. 125,50" required className="rounded-xl border px-3 py-2.5 text-sm" />
                <input name="title" placeholder="Beschreibung, z. B. Startbestand" required className="rounded-xl border px-3 py-2.5 text-sm" />
                <select name="category" className="rounded-xl border px-3 py-2.5 text-sm">
                  <option>Startbestand</option>
                  <option>Beiträge</option>
                  <option value="Strafen">FBZG</option>
                  <option>Getränke</option>
                  <option>Feier</option>
                  <option>Ausrüstung</option>
                  <option>Sonstiges</option>
                </select>
                <input name="occurred_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-xl border px-3 py-2.5 text-sm" />
                <input name="notes" placeholder="Notiz (optional)" className="rounded-xl border px-3 py-2.5 text-sm" />
                <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white sm:col-span-2">
                  Buchung speichern
                </button>
              </form>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black">Umsätze</h2>
                <div className="text-sm font-black text-slate-900">{formatCents(balanceCents)}</div>
              </div>

              <form method="get" className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="tab" value="transactions" />
                <select
                  name="kind"
                  defaultValue={transactionKindFilter}
                  className="rounded-xl border bg-white px-3 py-2 text-sm"
                >
                  <option value="all">Alle Buchungen</option>
                  <option value="income">Einnahmen</option>
                  <option value="expense">Ausgaben</option>
                  <option value="reversal">Stornos</option>
                </select>
                <select
                  name="category"
                  defaultValue={transactionCategoryFilter}
                  className="rounded-xl border bg-white px-3 py-2 text-sm"
                >
                  <option value="">Alle Kategorien</option>
                  {transactionCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <button className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700">
                  Filtern
                </button>
              </form>

              <div className="mt-4 space-y-2">
                {filteredTransactions.map((transaction) => {
                  const reversed = reversedTransactionIds.has(transaction.id);
                  return (
                    <div key={transaction.id} className="rounded-2xl border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-black text-slate-950">{transaction.title}</div>
                            {reversed ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">storniert</span>
                            ) : null}
                            {transaction.kind === "reversal" ? (
                              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700">Storno</span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {fmtDate(transaction.occurred_on)} · {transaction.category === "Strafen" ? "FBZG" : transaction.category}
                            {transaction.source_type && transaction.source_type !== "manual"
                              ? ` · automatisch: ${transaction.source_type}`
                              : ""}
                          </div>
                          {transaction.notes ? <div className="mt-1 text-xs text-slate-500">{transaction.notes}</div> : null}
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-black ${transaction.amount_cents >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                            {transaction.amount_cents >= 0 ? "+" : "−"}
                            {formatCents(Math.abs(transaction.amount_cents))}
                          </div>
                          {!reversed && transaction.kind !== "reversal" ? (
                            <form action={reverseCashTransactionAction} className="mt-2">
                              <input type="hidden" name="transaction_id" value={transaction.id} />
                              <button className="text-[10px] font-black text-slate-500 hover:text-rose-700">
                                Stornieren
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredTransactions.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Keine Umsätze für diesen Filter.
                  </p>
                ) : null}
              </div>
            </section>
          </>
        ) : null}

        {visibleTab === "contributions" ? (
          <>
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Neuer Beitrag</h2>
              <p className="mt-1 text-xs text-slate-500">
                Monatsbeitrag, Saisonbeitrag, Weihnachtsfeier oder jede andere gemeinsame Umlage.
              </p>
              <form action={addContributionAction} className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input name="title" placeholder="z. B. Saisonbeitrag 2026/27" required className="rounded-xl border px-3 py-2.5 text-sm" />
                  <input name="amount" inputMode="decimal" placeholder="Betrag, z. B. 25,00" required className="rounded-xl border px-3 py-2.5 text-sm" />
                  <input name="due_date" type="date" className="rounded-xl border px-3 py-2.5 text-sm" />
                  <input name="notes" placeholder="Notiz (optional)" className="rounded-xl border px-3 py-2.5 text-sm" />
                </div>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input type="checkbox" name="all_players" defaultChecked />
                  Alle aktiven Spieler
                </label>
                <details className="rounded-xl border bg-slate-50 p-3">
                  <summary className="cursor-pointer text-xs font-black text-slate-700">
                    Stattdessen einzelne Spieler auswählen
                  </summary>
                  <select name="player_ids" multiple size={Math.min(8, Math.max(3, players.length))} className="mt-3 w-full rounded-xl border bg-white px-3 py-2 text-sm">
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>{playerName(player)}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Dafür oben „Alle aktiven Spieler“ abwählen.
                  </p>
                </details>
                <button className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
                  Beitrag anlegen
                </button>
              </form>
            </section>

            <div className="space-y-3">
              {activeContributions.map((contribution) => {
                const members = contributionMembers.filter(
                  (member) => member.contribution_id === contribution.id,
                );
                const paid = members.filter((member) => member.status === "paid").length;
                const exempt = members.filter((member) => member.status === "exempt").length;
                const open = members.filter((member) => member.status === "open").length;

                return (
                  <details key={contribution.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm" open={activeContributions.length <= 2}>
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-black text-slate-950">{contribution.title}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatCents(contribution.amount_cents)} pro Spieler
                            {contribution.due_date ? ` · fällig ${fmtDate(contribution.due_date)}` : ""}
                          </div>
                        </div>
                        <div className="text-right text-xs font-bold text-slate-500">
                          <div>{paid} bezahlt · {open} offen</div>
                          {exempt ? <div>{exempt} befreit</div> : null}
                        </div>
                      </div>
                    </summary>

                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                      {members.map((member) => (
                        <div key={member.player_id} className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <b className="text-sm">{names.get(member.player_id) ?? member.player_id}</b>
                            <StatusBadge status={member.status} />
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(["open", "paid", "exempt"] as const).map((status) => (
                              <form key={status} action={setContributionStatusAction}>
                                <input type="hidden" name="contribution_id" value={contribution.id} />
                                <input type="hidden" name="player_id" value={member.player_id} />
                                <input type="hidden" name="status" value={status} />
                                <button
                                  disabled={member.status === status}
                                  className="rounded-lg border bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-600 disabled:bg-slate-900 disabled:text-white"
                                >
                                  {status === "open" ? "Offen" : status === "paid" ? "Bezahlt" : "Befreit"}
                                </button>
                              </form>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <form action={archiveContributionAction} className="mt-4 border-t border-slate-100 pt-3 text-right">
                      <input type="hidden" name="contribution_id" value={contribution.id} />
                      <input type="hidden" name="archived" value="1" />
                      <button className="text-xs font-black text-slate-500">Beitrag archivieren</button>
                    </form>
                  </details>
                );
              })}

              {activeContributions.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                  Noch keine aktiven Beiträge.
                </div>
              ) : null}
            </div>

            {archivedContributions.length ? (
              <details className="rounded-[24px] border border-slate-200 bg-white p-5">
                <summary className="cursor-pointer font-black">
                  Archivierte Beiträge ({archivedContributions.length})
                </summary>
                <div className="mt-3 space-y-2">
                  {archivedContributions.map((contribution) => (
                    <div key={contribution.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <span className="text-sm font-bold">{contribution.title}</span>
                      <form action={archiveContributionAction}>
                        <input type="hidden" name="contribution_id" value={contribution.id} />
                        <input type="hidden" name="archived" value="0" />
                        <button className="text-xs font-black text-slate-600">Reaktivieren</button>
                      </form>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </>
        ) : null}

        {visibleTab === "penalties" ? (
          <>
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Neuer FBZG-Eintrag</h2>
              <form action={addPenaltyAction} className="mt-4 space-y-3">
                <select name="player_id" required className="w-full rounded-xl border px-3 py-2.5 text-sm">
                  <option value="">Spieler wählen</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>{playerName(player)}</option>
                  ))}
                </select>
                <select name="preset" defaultValue="" className="w-full rounded-xl border px-3 py-2.5 text-sm">
                  <option value="">Eigener Anlass</option>
                  {rules.filter((rule) => rule.enabled).map((rule) => (
                    <option key={rule.rule_key} value={rule.rule_key}>
                      {rule.label} · {rule.value}
                    </option>
                  ))}
                </select>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input name="reason" placeholder="Eigener Grund" className="rounded-xl border px-3 py-2.5 text-sm" />
                  <select name="type" className="rounded-xl border px-3 py-2.5 text-sm">
                    <option value="beer">Sachbeitrag</option>
                    <option value="money">Geld</option>
                    <option value="custom">Sonstiges</option>
                  </select>
                  <input name="value" placeholder="z. B. Kuchen / 2 €" className="rounded-xl border px-3 py-2.5 text-sm" />
                </div>
                <input name="notes" placeholder="Notiz (optional)" className="w-full rounded-xl border px-3 py-2.5 text-sm" />
                <button className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
                  FBZG eintragen
                </button>
              </form>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Offene FBZG-Einträge · {openPenalties.length}</h2>
              <p className="mt-1 text-xs text-slate-500">
                Bei FBZG-Geldbeträgen erzeugt „Bezahlt“ automatisch eine Einnahme im Umsatzbuch.
              </p>
              <div className="mt-4 space-y-2">
                {openPenalties.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rounded-xl border p-3 ${isEscalated(entry) ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <b>{names.get(entry.player_id) ?? entry.player_id}</b>
                        <div className="text-sm text-slate-600">
                          {entry.reason} · <b>{entry.value}</b>
                        </div>
                        {isEscalated(entry) ? (
                          <div className="text-xs font-black text-amber-800">
                            Überfällig: {entry.escalation_value}
                          </div>
                        ) : entry.due_date && entry.escalation_value ? (
                          <div className="text-xs text-slate-500">
                            Bis {fmtDate(entry.due_date)} · danach {entry.escalation_value}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex gap-1">
                        <form action={resolvePenaltyAction}>
                          <input type="hidden" name="penalty_id" value={entry.id} />
                          <button className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-800">
                            {entry.type === "money" ? "✓ Bezahlt" : "✓ Erledigt"}
                          </button>
                        </form>
                        <form action={deletePenaltyAction}>
                          <input type="hidden" name="penalty_id" value={entry.id} />
                          <button className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-black text-red-700">
                            Löschen
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))}
                {openPenalties.length === 0 ? (
                  <p className="text-sm text-slate-500">Alles erledigt. 😄</p>
                ) : null}
              </div>
            </section>

            {resolvedPenalties.length ? (
              <details className="rounded-[24px] border border-slate-200 bg-white p-5">
                <summary className="cursor-pointer font-black">
                  Beglichen ({resolvedPenalties.length})
                </summary>
                <div className="mt-3 space-y-2">
                  {resolvedPenalties.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                      <span>
                        <b>{names.get(entry.player_id)}</b> · {entry.reason} · {entry.value}
                      </span>
                      <form action={reopenPenaltyAction}>
                        <input type="hidden" name="penalty_id" value={entry.id} />
                        <button className="text-xs font-black text-slate-600">Wieder öffnen</button>
                      </form>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </>
        ) : null}

        {visibleTab === "rules" ? (
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">FBZG-Regeln & Automatik</h2>
            <p className="mt-1 text-xs text-slate-500">
              Geld- oder Sachbeitrag, Aktivierung und Eskalation frei festlegen. Automatische Regeln wie „Verspätete Anmeldung“ laufen direkt in diese Liste.
            </p>
            <div className="mt-4 space-y-3">
              {rules.map((rule) => (
                <form key={rule.rule_key} action={savePenaltyRuleAction} className="rounded-2xl border bg-slate-50 p-3">
                  <input type="hidden" name="rule_key" value={rule.rule_key} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-black uppercase tracking-[.12em] text-slate-500">Regelname</span>
                      <input name="label" defaultValue={rule.label} className="w-full rounded-xl border bg-white px-3 py-2 text-sm font-bold" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-black uppercase tracking-[.12em] text-slate-500">Grund / Beschreibung</span>
                      <input name="reason" defaultValue={rule.reason} className="w-full rounded-xl border bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-black uppercase tracking-[.12em] text-slate-500">Art</span>
                      <select name="type" defaultValue={rule.type} className="w-full rounded-xl border bg-white px-3 py-2 text-sm">
                        <option value="beer">Sachposten</option>
                        <option value="money">Geld</option>
                        <option value="custom">Sonstiges</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-black uppercase tracking-[.12em] text-slate-500">Wert / Beitrag</span>
                      <input name="value" defaultValue={rule.value} className="w-full rounded-xl border bg-white px-3 py-2 text-sm" />
                    </label>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-black uppercase tracking-[.12em] text-slate-500">Eskalation nach Tagen</span>
                      <input name="escalation_after_days" type="number" min="1" defaultValue={rule.escalation_after_days ?? ""} placeholder="z. B. 28" className="w-full rounded-xl border bg-white px-3 py-2 text-sm" />
                      <span className="mt-1 block text-[10px] font-medium text-slate-500">Nach wie vielen Tagen sich der Beitrag verschärft.</span>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-black uppercase tracking-[.12em] text-slate-500">Danach gilt</span>
                      <input name="escalation_value" defaultValue={rule.escalation_value ?? ""} placeholder="z. B. + 1 Sechserträger" className="w-full rounded-xl border bg-white px-3 py-2 text-sm" />
                      <span className="mt-1 block text-[10px] font-medium text-slate-500">Optional: zusätzlicher oder verschärfter FBZG-Beitrag nach Ablauf.</span>
                    </label>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-black">
                      <input type="checkbox" name="enabled" defaultChecked={rule.enabled} /> Aktiv
                    </label>
                    <button className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">
                      Regel speichern
                    </button>
                  </div>
                </form>
              ))}
            </div>
          </section>
        ) : null}

        {visibleTab === "settings" ? (
          <>
            {isClubAdmin ? (
              <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black">Kassenwart</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Ein Kassenwart kann die Mannschaftskasse verwalten, ohne Club-Admin sein zu müssen.
                </p>

                <div className="mt-4 space-y-2">
                  {managers.map((manager) => (
                    <div key={manager.user_id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <span className="text-sm font-bold">
                        {namesByUserId.get(manager.user_id) ?? "Mitglied"}
                      </span>
                      <form action={setCashboxManagerAction}>
                        <input type="hidden" name="user_id" value={manager.user_id} />
                        <input type="hidden" name="enabled" value="0" />
                        <button className="text-xs font-black text-rose-700">Entfernen</button>
                      </form>
                    </div>
                  ))}
                </div>

                <form action={setCashboxManagerAction} className="mt-4 flex gap-2">
                  <select name="user_id" required className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm">
                    <option value="">Kassenwart wählen</option>
                    {players
                      .filter((player) => player.user_id && !managers.some((manager) => manager.user_id === player.user_id))
                      .map((player) => (
                        <option key={player.id} value={player.user_id ?? ""}>
                          {playerName(player)}
                        </option>
                      ))}
                  </select>
                  <input type="hidden" name="enabled" value="1" />
                  <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">
                    Hinzufügen
                  </button>
                </form>
              </section>
            ) : null}

            {isClubAdmin ? (
              <section className="rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[.18em] text-amber-700">
                      Club Extra
                    </div>
                    <h2 className="mt-1 text-lg font-black">🍺 Bierkasse+</h2>
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      Bier eintragen, Verbrauch und Zahlung getrennt führen und wahlweise per PayPal oder bar abrechnen.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-black text-white">
                    0,99 € / Monat
                  </span>
                </div>

                {q?.beerkasse_saved ? (
                  <p className="mt-3 text-xs font-bold text-emerald-700">✓ Gespeichert</p>
                ) : null}
                {q?.beerkasse_error ? (
                  <p className="mt-3 text-xs font-bold text-red-700">
                    {q.beerkasse_error === "premium"
                      ? "Bierkasse+ ist für diesen Club noch nicht freigeschaltet."
                      : q.beerkasse_error === "price"
                        ? "Bitte einen gültigen Preis pro Bier eintragen."
                        : q.beerkasse_error === "url"
                          ? "Bitte einen gültigen https-PayPal-Link eintragen."
                          : "Bierkasse+ konnte nicht gespeichert werden."}
                  </p>
                ) : null}

                {settings?.beerkasse_premium_enabled === true ? (
                  <>
                    <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                      <div>
                        <div className="text-sm font-black text-emerald-900">Premium freigeschaltet</div>
                        <div className="text-[11px] font-medium text-emerald-700">Der Club kann selbst entscheiden, ob das Modul sichtbar ist.</div>
                      </div>
                      <span className="text-lg">✓</span>
                    </div>

                    <form action={saveBeerkasseAction} className="mt-4 space-y-3">
                      <label className="block">
                        <span className="mb-1 block text-xs font-black text-slate-600">Preis pro Bier</span>
                        <div className="relative">
                          <input
                            name="price"
                            inputMode="decimal"
                            defaultValue={((settings?.beerkasse_price_cents ?? 200) / 100).toFixed(2).replace(".", ",")}
                            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 pr-10 text-sm font-bold"
                          />
                          <span className="absolute right-3 top-2.5 text-sm font-black text-slate-400">€</span>
                        </div>
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-black text-slate-600">PayPal-Link <span className="font-medium text-slate-400">(optional)</span></span>
                        <input
                          name="paypal_url"
                          defaultValue={settings?.beerkasse_paypal_url ?? ""}
                          placeholder="https://paypal.me/..."
                          className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm"
                        />
                        <span className="mt-1 block text-[10px] font-medium text-slate-500">
                          Bei paypal.me wird der Betrag automatisch vorbelegt. Ohne Link bleibt Barzahlung trotzdem verfügbar.
                        </span>
                      </label>

                      <div className="space-y-2 rounded-2xl border border-amber-100 bg-white/80 p-3">
                        <label className="flex items-center justify-between gap-3 text-sm font-bold">
                          <span>🍺 Bierkasse+ aktiv</span>
                          <input type="checkbox" name="enabled" defaultChecked={settings?.beerkasse_enabled === true} className="h-5 w-5" />
                        </label>
                        <label className="flex items-center justify-between gap-3 text-sm font-bold">
                          <span>📊 Bierstatistik anzeigen</span>
                          <input type="checkbox" name="stats_enabled" defaultChecked={settings?.beerkasse_stats_enabled !== false} className="h-5 w-5" />
                        </label>
                        <label className="flex items-center justify-between gap-3 text-sm font-bold">
                          <span>🏅 Bier-Badges anzeigen</span>
                          <input type="checkbox" name="badges_enabled" defaultChecked={settings?.beerkasse_badges_enabled !== false} className="h-5 w-5" />
                        </label>
                        <label className="flex items-center justify-between gap-3 text-sm font-bold">
                          <span>🏠 „Bier eintragen“ auf Home</span>
                          <input type="checkbox" name="home_enabled" defaultChecked={settings?.beerkasse_home_enabled === true} className="h-5 w-5" />
                        </label>
                      </div>

                      <button className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
                        Bierkasse+ speichern
                      </button>
                    </form>

                    {isPowerUser ? (
                      <form action={setBeerkassePremiumAction} className="mt-3">
                        <input type="hidden" name="enabled" value="0" />
                        <button className="text-[10px] font-bold text-slate-400 underline">
                          Power User: Premium-Freigabe entfernen
                        </button>
                      </form>
                    ) : null}
                  </>
                ) : (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-white p-4">
                    <div className="font-black text-slate-950">Bierkasse+ ist nicht freigeschaltet</div>
                    <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
                      Ohne Freigabe sind Bier-Checkout, Statistik, Badges und Home-Button für den Club komplett unsichtbar.
                    </p>
                    {isPowerUser ? (
                      <form action={setBeerkassePremiumAction} className="mt-3">
                        <input type="hidden" name="enabled" value="1" />
                        <button className="w-full rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950">
                          Power User: für diesen Club freischalten
                        </button>
                      </form>
                    ) : (
                      <div className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                        Premium-Add-on · 0,99 € / Monat pro Club
                      </div>
                    )}
                  </div>
                )}
              </section>
            ) : (
              <div className="rounded-[24px] border bg-white p-5 text-sm text-slate-600">
                Du verwaltest die Kasse als Kassenwart. Club- und Rollen-Einstellungen bleiben beim Admin.
              </div>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}
