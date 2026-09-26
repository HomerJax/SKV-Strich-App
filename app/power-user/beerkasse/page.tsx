import Link from "next/link";
import { Beer, Building2, Clock3, CreditCard, ReceiptText } from "lucide-react";
import { requirePowerUser } from "@/lib/auth/power-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerI18n } from "@/lib/i18n/server";

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

function euro(cents: number, locale: "de" | "en") {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function dateTime(value: string, locale: "de" | "en") {
  return new Date(value).toLocaleString(locale === "de" ? "de-DE" : "en-GB");
}

export default async function PowerUserBeerkassePage() {
  await requirePowerUser();
  const { locale, t } = await getServerI18n();
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
      club.display_name?.trim() || club.name?.trim() || t("powerBeer.unnamedClub"),
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
      clubName: clubNames.get(row.club_id) ?? t("powerBeer.unknownClub"),
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
              {t("powerBeer.eyebrow")}
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">
              {t("powerBeer.title")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/55">
              {t("powerBeer.description")}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: t("powerBeer.beersRecorded"),
              value: `${beers} 🍺`,
              text: t("powerBeer.activeEntries", { count: activeRows.length, today: beersToday, week: beers7d }),
              icon: <Beer className="h-5 w-5" />,
            },
            {
              label: t("powerBeer.paidConfirmed"),
              value: euro(paidCents, locale),
              text: t("powerBeer.paidHint"),
              icon: <CreditCard className="h-5 w-5" />,
            },
            {
              label: t("powerBeer.cashOpen"),
              value: euro(openCashCents, locale),
              text: t("powerBeer.cashOpenHint"),
              icon: <Clock3 className="h-5 w-5" />,
            },
            {
              label: t("powerBeer.paypalPending"),
              value: euro(pendingPaypalCents, locale),
              text: t("powerBeer.paypalPendingHint"),
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
                {t("powerBeer.clubs")}
              </div>
              <h2 className="mt-1 text-xl font-black text-slate-950">{t("powerBeer.ranking")}</h2>
            </div>
            <Building2 className="h-5 w-5 text-slate-400" />
          </div>

          <div className="mt-4 space-y-2">
            {clubStats.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                {t("powerBeer.empty")}
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
                      {t("powerBeer.clubEntries", { count: club.bookings, value: euro(club.totalCents, locale) })}
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
            {t("powerBeer.recent")}
          </div>
          <div className="mt-4 space-y-2">
            {rows.slice(0, 25).map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-2 rounded-2xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-sm font-black text-slate-950">
                    {clubNames.get(row.club_id) ?? t("powerBeer.unknownClub")} · {row.quantity} 🍺
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-500">
                    {t("powerBeer.player", { id: row.player_id })} · {euro(row.total_cents, locale)} · {row.payment_method === "cash" ? t("powerBeer.cash") : "PayPal"} · {
                      row.payment_status === "paid"
                        ? t("powerBeer.paid")
                        : row.payment_status === "cancelled"
                          ? t("powerBeer.cancelled")
                          : t("powerBeer.pending")
                    }
                  </div>
                </div>
                <div className="text-xs font-medium text-slate-400">
                  {dateTime(row.created_at, locale)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
