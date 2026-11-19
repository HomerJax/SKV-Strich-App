import Link from "next/link";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

type BeerRow = { player_id: number; quantity: number; created_at: string; payment_method: string | null };
type PlayerRow = { id: number; name: string | null; nickname: string | null; first_name: string | null; last_name: string | null };

export default async function BeerLeaderboardPage() {
  const { clubId } = await requireClub();
  const supabase = await createClient();
  const [{ data: settings }, { data: beers, error }, { data: players }] = await Promise.all([
    supabase.from("club_settings").select("beerkasse_enabled").eq("club_id", clubId).maybeSingle(),
    supabase.from("beer_consumptions").select("player_id,quantity,created_at,payment_method").eq("club_id", clubId).eq("payment_status", "paid").is("cancelled_at", null).gte("created_at", "2026-10-01T00:00:00+02:00"),
    supabase.from("players").select("id,name,nickname,first_name,last_name").eq("club_id", clubId).eq("is_guest", false),
  ]);
  if (!settings?.beerkasse_enabled) {
    return <main className="mx-auto max-w-2xl px-4 py-8"><Link href="/home" className="text-sm font-bold text-slate-600">← Home</Link><p className="mt-6">Die Bierkasse ist in diesem Verein nicht aktiviert.</p></main>;
  }
  const names = new Map(((players ?? []) as PlayerRow[]).map(p => [p.id, p.nickname?.trim() || [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.name || "Spieler"]));
  const totals = new Map<number, number>();
  const history = new Map<number, BeerRow[]>();
  for (const beer of (beers ?? []) as BeerRow[]) {
    totals.set(beer.player_id, (totals.get(beer.player_id) ?? 0) + Number(beer.quantity || 0));
    history.set(beer.player_id, [...(history.get(beer.player_id) ?? []), beer]);
  }
  for (const entries of history.values()) entries.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const ranking = [...totals.entries()].map(([id, count]) => ({ id, count, name: names.get(id) ?? "Spieler" })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "de"));
  return <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
    <Link href="/home" className="text-sm font-bold text-slate-600">← Home</Link>
    <header className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-xs font-black uppercase tracking-widest text-amber-700">🍺 Bierkasse</p>
      <h1 className="mt-1 text-2xl font-black text-slate-950">Bier-Rangliste</h1>
      <p className="mt-2 text-sm text-slate-600">Nur bestätigte Bierbuchungen. Offene und stornierte Zahlungen zählen nicht.</p>
    </header>
    {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">Die Rangliste konnte nicht geladen werden.</p> : ranking.length === 0 ? <p className="rounded-xl bg-white p-5 text-sm text-slate-600">Noch keine bestätigten Biere.</p> : <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {ranking.map((entry, index) => {
        const entries = history.get(entry.id) ?? [];
        return <details key={entry.id} className="group border-b border-slate-100 last:border-b-0">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <span className="w-10 shrink-0 text-lg font-black text-teal-700">{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1 + "."}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">{entry.name}</span>
            <span className="shrink-0 text-sm font-black text-slate-950">{entry.count} 🍺</span>
            <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="border-t border-slate-100 bg-slate-50/70 px-4 pb-4 pt-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-600">
              <span>{entries.length} bestätigte Buchungen</span><span>Platz {index + 1}</span>
            </div>
            <div className="space-y-2">
              {entries.map((beer, beerIndex) => <div key={`${beer.created_at}-${beerIndex}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-sm shadow-sm">
                <div>
                  <div className="font-bold text-slate-900">{new Date(beer.created_at).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" })}</div>
                  <div className="text-xs text-slate-500">{beer.payment_method === "cash" ? "Bar" : beer.payment_method === "paypal" ? "PayPal" : beer.payment_method === "sumup" ? "SumUp" : "Zahlung"} · bestätigt</div>
                </div>
                <span className="font-black text-slate-900">{beer.quantity} 🍺</span>
              </div>)}
            </div>
            <p className="mt-3 text-xs text-slate-500">Angezeigt wird das Buchungsdatum, nicht der genaue Trink- oder Zahlungszeitpunkt.</p>
          </div>
        </details>;
      })}
    </section>}
  </main>;
}
