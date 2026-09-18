import Link from "next/link";
import { requireCashboxAccess } from "@/lib/cashbox/access";
import { formatCents, parseEuroToCents } from "@/lib/cashbox/money";
import { createClient } from "@/lib/supabase/server";
import { reportPenaltyAction } from "./actions";

type Props = {
  searchParams?: Promise<{ saved?: string; error?: string }>;
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

export default async function Page({ searchParams }: Props) {
  const q = await searchParams;
  const access = await requireCashboxAccess();
  const { clubId, player, canManageCashbox } = access;
  const supabase = await createClient();

  const [
    { data: playersData },
    { data: penaltiesData },
    { data: settings },
    { data: rulesData },
    { data: transactionsData },
    { data: contributionsData },
    { data: contributionMembersData },
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
      .select("beerkasse_enabled,beerkasse_paypal_url")
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
      .order("id", { ascending: false })
      .limit(20),
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
  ]);

  const players = (playersData ?? []) as Player[];
  const penalties = (penaltiesData ?? []) as Penalty[];
  const rules = (rulesData ?? []) as Rule[];
  const transactions = (transactionsData ?? []) as Transaction[];
  const contributions = (contributionsData ?? []) as Contribution[];
  const contributionMembers = (contributionMembersData ?? []) as ContributionMember[];
  const names = new Map(players.map((entry) => [entry.id, playerName(entry)]));
  const openPenalties = penalties.filter((entry) => !entry.resolved_at);
  const mine = player
    ? openPenalties.filter((entry) => entry.player_id === player.id)
    : [];
  const myContributionMembers = player
    ? contributionMembers.filter((entry) => entry.player_id === player.id)
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
  const pay =
    settings?.beerkasse_enabled && settings?.beerkasse_paypal_url
      ? settings.beerkasse_paypal_url
      : null;
  const today = new Date().toISOString().slice(0, 10);
  const teamBalance = transactions.reduce(
    (sum, transaction) => sum + transaction.amount_cents,
    0,
  );

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto max-w-4xl space-y-4 px-4 py-5 pb-24">
        <div className="flex items-center justify-between gap-3">
          <Link href="/home" className="text-sm font-semibold text-slate-600">
            ← Home
          </Link>
          {canManageCashbox ? (
            <Link
              href="/admin/penalties"
              className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white"
            >
              Kasse verwalten
            </Link>
          ) : null}
        </div>

        <div className="rounded-[28px] bg-slate-950 p-5 text-white">
          <div className="text-[11px] font-black uppercase tracking-[.2em] text-white/45">
            Teamleben
          </div>
          <h1 className="mt-1 text-2xl font-black">💰 Mannschaftskasse</h1>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/8 p-3">
              <div className="text-lg font-black">{formatCents(teamBalance)}</div>
              <div className="mt-1 text-[10px] font-bold text-white/50">Teamkasse</div>
            </div>
            <div className="rounded-2xl bg-white/8 p-3">
              <div className="text-lg font-black">{mine.length}</div>
              <div className="mt-1 text-[10px] font-bold text-white/50">meine Strafen</div>
            </div>
            <div className="rounded-2xl bg-white/8 p-3">
              <div className="text-lg font-black">
                {formatCents(myOpenPenaltyCents + myOpenContributionCents)}
              </div>
              <div className="mt-1 text-[10px] font-bold text-white/50">bei mir offen</div>
            </div>
          </div>
        </div>

        {pay ? (
          <a
            href={pay}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-[22px] border border-amber-200 bg-amber-50 p-4"
          >
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-amber-700">
                💸 Bezahlen
              </div>
              <div className="mt-0.5 font-black">Direkt zur Mannschaftskasse</div>
              <p className="text-xs text-slate-600">
                Zahlung per hinterlegtem PayPal-Link.
              </p>
            </div>
            <span className="rounded-full bg-amber-400 px-3 py-2 text-xs font-black">
              PayPal →
            </span>
          </a>
        ) : null}

        {q?.saved ? (
          <div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
            Posten eingetragen. 😄
          </div>
        ) : null}
        {q?.error ? (
          <div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">
            {q.error}
          </div>
        ) : null}

        <section className="rounded-[24px] border bg-white p-5">
          <h2 className="text-lg font-black">Meine Beiträge</h2>
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
                          ? ` · fällig ${fmtDate(contribution.due_date)}`
                          : ""}
                      </div>
                    </div>
                    <div className="text-xs font-black">
                      {member.status === "paid"
                        ? "✓ Bezahlt"
                        : member.status === "exempt"
                          ? "Befreit"
                          : "Offen"}
                    </div>
                  </div>
                </div>
              );
            })}
            {myContributionMembers.length === 0 ? (
              <p className="text-sm text-slate-500">Aktuell keine Beiträge für dich.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-[24px] border bg-white p-5">
          <h2 className="text-lg font-black">Meine offenen Strafen</h2>
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
                    {entry.due_date ? ` · bis ${fmtDate(entry.due_date)}` : ""}
                  </div>
                  {escalated ? (
                    <div className="mt-1 text-xs font-black text-amber-700">
                      ⏰ Überfällig: {entry.escalation_value}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {mine.length === 0 ? (
              <p className="text-sm text-slate-500">Bei dir ist alles sauber. 😄</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-[24px] border bg-white p-5">
          <h2 className="text-lg font-black">Posten melden</h2>
          <p className="mt-1 text-xs text-slate-500">
            Jeder im Team darf einen Posten melden. Bezahlt, befreit oder storniert wird durch Kassenwart/Admin.
          </p>
          <form action={reportPenaltyAction} className="mt-4 space-y-3">
            <select
              name="player_id"
              required
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
            >
              <option value="">Wen hat&apos;s erwischt?</option>
              {players.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {playerName(entry)}
                </option>
              ))}
            </select>
            <select name="preset" className="w-full rounded-xl border px-3 py-2.5 text-sm">
              <option value="">Eigener Posten</option>
              {rules.map((rule) => (
                <option key={rule.rule_key} value={rule.rule_key}>
                  {rule.label} · {rule.value}
                </option>
              ))}
            </select>
            <div className="grid gap-2 sm:grid-cols-3">
              <input name="reason" placeholder="Eigener Grund" className="rounded-xl border px-3 py-2.5 text-sm" />
              <select name="type" className="rounded-xl border px-3 py-2.5 text-sm">
                <option value="beer">Sachposten</option>
                <option value="money">Geld</option>
                <option value="custom">Sonstiges</option>
              </select>
              <input name="value" placeholder="z. B. Kuchen / 2 €" className="rounded-xl border px-3 py-2.5 text-sm" />
            </div>
            <input name="notes" placeholder="Notiz (optional)" className="w-full rounded-xl border px-3 py-2.5 text-sm" />
            <button className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
              Posten eintragen
            </button>
          </form>
        </section>

        <details className="rounded-[24px] border bg-white p-5">
          <summary className="cursor-pointer font-black">Letzte Kassenbewegungen</summary>
          <div className="mt-3 space-y-2">
            {transactions.slice(0, 10).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                <div>
                  <div className="text-sm font-bold">{transaction.title}</div>
                  <div className="text-[11px] text-slate-500">
                    {fmtDate(transaction.occurred_on)} · {transaction.category}
                  </div>
                </div>
                <div className={`text-sm font-black ${transaction.amount_cents >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {transaction.amount_cents >= 0 ? "+" : "−"}
                  {formatCents(Math.abs(transaction.amount_cents))}
                </div>
              </div>
            ))}
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500">Noch keine Kassenbewegungen.</p>
            ) : null}
          </div>
        </details>

        <details className="rounded-[24px] border bg-white p-5">
          <summary className="cursor-pointer font-black">
            Teamweit offene Strafen ({openPenalties.length})
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
