import Link from "next/link";
import { requireBeerManagementAccess } from "@/lib/cashbox/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCents } from "@/lib/cashbox/money";
import {
  cancelBeerConsumptionAction,
  markBeerCashPaidAction,
  updateBeerConsumptionAction,
} from "../actions";

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

type BeerRow = {
  id: number;
  player_id: number;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  payment_method: "paypal" | "cash";
  payment_status: "pending" | "paid" | "cancelled";
  paid_at: string | null;
  created_at: string;
};

function playerName(player: Player) {
  return (
    player.nickname?.trim() ||
    [player.first_name, player.last_name].filter(Boolean).join(" ") ||
    player.name ||
    `Spieler ${player.id}`
  );
}

function dateTime(value: string) {
  return new Date(value).toLocaleString("de-DE");
}

function statusLabel(row: BeerRow) {
  if (row.payment_status === "cancelled") return "Storniert";
  if (row.payment_status === "paid") return "✓ Bezahlt";
  return row.payment_method === "cash" ? "Bar offen" : "PayPal ungeklärt";
}

export default async function BeerManagementPage({ searchParams }: Props) {
  const q = await searchParams;
  const { clubId, isClubAdmin } = await requireBeerManagementAccess();
  const admin = createAdminClient();

  const [{ data: playersData }, { data: rowsData }] = await Promise.all([
    admin
      .from("players")
      .select("id,name,first_name,last_name,nickname")
      .eq("club_id", clubId)
      .eq("is_guest", false),
    admin
      .from("beer_consumptions")
      .select("id,player_id,quantity,unit_price_cents,total_cents,payment_method,payment_status,paid_at,created_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false }),
  ]);

  const players = (playersData ?? []) as Player[];
  const rows = (rowsData ?? []) as BeerRow[];
  const names = new Map(players.map((player) => [player.id, playerName(player)]));
  const activeRows = rows.filter((row) => row.payment_status !== "cancelled");
  const pendingCash = activeRows.filter(
    (row) => row.payment_method === "cash" && row.payment_status === "pending",
  );
  const totalBeers = activeRows.reduce((sum, row) => sum + row.quantity, 0);
  const pendingCashCents = pendingCash.reduce((sum, row) => sum + row.total_cents, 0);
  const paidCashCents = activeRows
    .filter((row) => row.payment_method === "cash" && row.payment_status === "paid")
    .reduce((sum, row) => sum + row.total_cents, 0);
  const pendingPaypalCents = activeRows
    .filter((row) => row.payment_method === "paypal" && row.payment_status === "pending")
    .reduce((sum, row) => sum + row.total_cents, 0);

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto max-w-5xl space-y-4 px-4 py-5 pb-24">
        <div className="flex items-center justify-between gap-3">
          <Link href="/mannschaftskasse" className="text-sm font-semibold text-slate-600">
            ← Mannschaftskasse
          </Link>
          {isClubAdmin ? (
            <Link href="/admin/members" className="text-xs font-black text-slate-500">
              Berechtigungen →
            </Link>
          ) : (
            <span className="text-[10px] font-black uppercase tracking-[.14em] text-amber-700">
              Bierkassen-Verwalter
            </span>
          )}
        </div>

        <div className="relative overflow-hidden rounded-[28px] bg-slate-950 p-5 text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="relative">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">🍺 Bierkasse+</div>
            <h1 className="mt-1 text-2xl font-black">Bierkonto verwalten</h1>
            <p className="mt-2 max-w-xl text-sm font-medium text-white/60">
              Verbrauch ist Verbrauch. Bezahlt ist erst bezahlt, wenn es bestätigt wurde.
            </p>
          </div>
        </div>

        {q?.saved ? (
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">✓ Gespeichert</div>
        ) : null}
        {q?.error ? (
          <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">{q.error}</div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Bier erfasst", `${totalBeers} 🍺`, "Konsum ohne Stornos"],
            ["Bar offen", formatCents(pendingCashCents), `${pendingCash.length} Einträge`],
            ["Bar bestätigt", formatCents(paidCashCents), "in Teamkasse verbucht"],
            ["PayPal ungeklärt", formatCents(pendingPaypalCents), "Webhook folgt später"],
          ].map(([label, value, hint]) => (
            <div key={label} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[.15em] text-slate-400">{label}</div>
              <div className="mt-2 text-xl font-black text-slate-950">{value}</div>
              <div className="mt-1 text-[11px] font-medium text-slate-500">{hint}</div>
            </div>
          ))}
        </div>

        <section className="rounded-[26px] border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-amber-700">Barzahlung</div>
              <h2 className="mt-1 text-lg font-black text-slate-950">Noch zu bestätigen</h2>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
              {pendingCash.length} offen
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {pendingCash.map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-black text-slate-950">{names.get(row.player_id) ?? `Spieler ${row.player_id}`}</div>
                    <div className="mt-1 text-xs font-medium text-slate-500">
                      {row.quantity} 🍺 · {formatCents(row.total_cents)} · {dateTime(row.created_at)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <form action={updateBeerConsumptionAction} className="flex items-center gap-1">
                      <input type="hidden" name="consumption_id" value={row.id} />
                      <input
                        name="quantity"
                        type="number"
                        min={1}
                        max={99}
                        defaultValue={row.quantity}
                        className="w-16 rounded-xl border border-slate-200 px-2 py-2 text-center text-xs font-black"
                      />
                      <button className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-black text-slate-700">
                        Korrigieren
                      </button>
                    </form>

                    <form action={markBeerCashPaidAction}>
                      <input type="hidden" name="consumption_id" value={row.id} />
                      <button className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white">
                        ✓ Bar bezahlt
                      </button>
                    </form>

                    <form action={cancelBeerConsumptionAction}>
                      <input type="hidden" name="consumption_id" value={row.id} />
                      <button className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">
                        Storno
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
            {pendingCash.length === 0 ? (
              <div className="rounded-2xl bg-emerald-50 px-4 py-4 text-sm font-bold text-emerald-800">
                Alles sauber – keine offene Barzahlung. 🍻
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Letzte Bier-Einträge</h2>
          <div className="mt-4 space-y-2">
            {rows.slice(0, 30).map((row) => (
              <div key={row.id} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${row.payment_status === "cancelled" ? "bg-slate-50 opacity-55" : "bg-slate-50"}`}>
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-slate-900">
                    {names.get(row.player_id) ?? `Spieler ${row.player_id}`} · {row.quantity} 🍺
                  </div>
                  <div className="mt-0.5 text-[10px] font-medium text-slate-500">
                    {row.payment_method === "cash" ? "Bar" : "PayPal"} · {formatCents(row.total_cents)} · {dateTime(row.created_at)}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${
                  row.payment_status === "paid"
                    ? "bg-emerald-100 text-emerald-800"
                    : row.payment_status === "cancelled"
                      ? "bg-slate-200 text-slate-600"
                      : "bg-amber-100 text-amber-900"
                }`}>
                  {statusLabel(row)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
