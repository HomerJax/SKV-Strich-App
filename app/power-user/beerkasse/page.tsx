import Link from "next/link";
import { Beer, Building2, Clock3, CreditCard, ReceiptText } from "lucide-react";
import { requirePowerUser } from "@/lib/auth/power-user";
import { createAdminClient } from "@/lib/supabase/admin";

type BeerRow = {
  id: number;
  club_id: string;
  player_id: number;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  payment_method: "paypal" | "cash";
  payment_status: "pending" | "paid" | "cancelled";
  created_at: string;
};

type ClubRow = {
  id: string;
  display_name: string | null;
  name: string | null;
};

function euro(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function dateTime(value: string) {
  return new Date(value).toLocaleString("de-DE");
}

export default async function PowerUserBeerkassePage() {
  await requirePowerUser();
  const admin = createAdminClient();

  const [{ data: beerData, error: beerError }, { data: clubsData }] =
    await Promise.all([
      admin
        .from("beer_consumptions")
        .select("id,club_id,player_id,quantity,unit_price_cents,total_cents,payment_method,payment_status,created_at")
        .order("created_at", { ascending: false }),
      admin.from("clubs").select("id,display_name,name"),
    ]);

  const rows = beerError ? [] : ((beerData ?? []) as BeerRow[]);
  const clubs = (clubsData ?? []) as ClubRow[];
  const clubNames = new Map(
    clubs.map((club) => [
      club.id,
      club.display_name?.trim() || club.name?.trim() || "Unbenannter Club",
    ])
  );

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const activeRows = rows.filter((row) => row.payment_status !== "cancelled");
  const beers = activeRows.reduce((sum, row) => sum + row.quantity, 0);
  const totalCents = activeRows.reduce((sum, row) => sum + row.total_cents, 0);
  const paidCents = activeRows
    .filter((row) => row.payment_status === "paid")
    .reduce((sum, row) => sum + row.total_cents, 0);
  const openCashCents = activeRows
    .filter((row) => row.payment_method === "cash" && row.payment_status === "pending")
    .reduce((sum, row) => sum + row.total_cents, 0);
  const pendingPaypalCents = activeRows
    .filter((row) => row.payment_method === "paypal" && row.payment_status === "pending")
    .reduce((sum, row) => sum + row.total_cents, 0);
  const beersToday = activeRows
    .filter((row) => now - new Date(row.created_at).getTime() < dayMs)
    .reduce((sum, row) => sum + row.quantity, 0);
  const beers7d = activeRows
    .filter((row) => now - new Date(row.created_at).getTime() < 7 * dayMs)
    .reduce((sum, row) => sum + row.quantity, 0);

  const byClub = new Map<
    string,
    { clubId: string; clubName: string; beers: number; totalCents: number; bookings: number }
  >();

  for (const row of activeRows) {
    const current = byClub.get(row.club_id) ?? {
      clubId: row.club_id,
      clubName: clubNames.get(row.club_id) ?? "Unbekannter Club",
      beers: 0,
      totalCents: 0,
      bookings: 0,
    };

    current.beers += row.quantity;
    current.totalCents += row.total_cents;
    current.bookings += 1;
    byClub.set(row.club_id, current);
  }

  const clubStats = [...byClub.values()].sort(
    (a, b) => b.beers - a.beers || b.bookings - a.bookings
  );

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <Link
            href="/power-user"
            className="inline-flex items-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900"
          >
            ← Power User
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-[32px] bg-[#070b12] p-6 text-white shadow-sm sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="relative">
            <div className="text-[11px] font-black uppercase tracking-[.2em] text-amber-300">
              🍺 strikr Bierkasse
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">
              Wie viel Bier läuft eigentlich über strikr?
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/55">
              Verbrauch und Zahlung sind jetzt getrennt. Barzahlungen werden durch einen
              Bierkassen-Verwalter bestätigt; PayPal bleibt bis zur technischen Rückmeldung ungeklärt.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Bier erfasst",
              value: `${beers} 🍺`,
              text: `${activeRows.length} aktive Einträge · 24h: ${beersToday} · 7d: ${beers7d}`,
              icon: <Beer className="h-5 w-5" />,
            },
            {
              label: "Bestätigt bezahlt",
              value: euro(paidCents),
              text: "aktuell vor allem bestätigte Barzahlungen",
              icon: <CreditCard className="h-5 w-5" />,
            },
            {
              label: "Bar offen",
              value: euro(openCashCents),
              text: "wartet auf Bestätigung im Club",
              icon: <Clock3 className="h-5 w-5" />,
            },
            {
              label: "PayPal ungeklärt",
              value: euro(pendingPaypalCents),
              text: "bis ein PayPal-Webhook angebunden ist",
              icon: <ReceiptText className="h-5 w-5" />,
            },
          ].map((card) => (
            <div key={card.label} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">
                  {card.label}
                </div>
                <div className="text-slate-400">{card.icon}</div>
              </div>
              <div className="mt-3 text-2xl font-black text-slate-950">{card.value}</div>
              <div className="mt-1 text-xs font-medium text-slate-500">{card.text}</div>
            </div>
          ))}
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">
                Clubs
              </div>
              <h2 className="mt-1 text-xl font-black text-slate-950">Bier-Ranking</h2>
            </div>
            <Building2 className="h-5 w-5 text-slate-400" />
          </div>

          <div className="mt-4 space-y-2">
            {clubStats.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Noch keine Bierbuchungen vorhanden.
              </div>
            ) : (
              clubStats.map((club, index) => (
                <div
                  key={club.clubId}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-950">
                      {index + 1}. {club.clubName}
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-500">
                      {club.bookings} Einträge · {euro(club.totalCents)} Verbrauchswert
                    </div>
                  </div>
                  <div className="shrink-0 text-lg font-black text-slate-950">
                    {club.beers} 🍺
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">
            Letzte Buchungen
          </div>
          <div className="mt-4 space-y-2">
            {rows.slice(0, 25).map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-2 rounded-2xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-sm font-black text-slate-950">
                    {clubNames.get(row.club_id) ?? "Unbekannter Club"} · {row.quantity} 🍺
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-500">
                    Spieler #{row.player_id} · {euro(row.total_cents)} · {row.payment_method === "cash" ? "Bar" : "PayPal"} · {
                      row.payment_status === "paid"
                        ? "bezahlt"
                        : row.payment_status === "cancelled"
                          ? "storniert"
                          : "offen/ungeklärt"
                    }
                  </div>
                </div>
                <div className="text-xs font-medium text-slate-400">
                  {dateTime(row.created_at)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
