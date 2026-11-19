import Link from "next/link";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

type BeerRow = { player_id: number; quantity: number; created_at: string };
type PlayerRow = { id: number; name: string | null; nickname: string | null; first_name: string | null; last_name: string | null };

export default async function BeerLeaderboardPage() {
  const { clubId } = await requireClub();
  const supabase = await createClient();
  const [{ data: settings }, { data: beers, error }, { data: players }] = await Promise.all([
    supabase.from("club_settings").select("beerkasse_enabled").eq("club_id", clubId).maybeSingle(),
    supabase.from("beer_consumptions").select("player_id,quantity,created_at").eq("club_id", clubId).eq("payment_status", "paid").is("cancelled_at", null).gte("created_at", "2026-10-01T00:00:00+02:00"),
    supabase.from("players").select("id,name,nickname,first_name,last_name").eq("club_id", clubId).eq("is_guest", false),
  ]);
  if (!settings?.beerkasse_enabled) {
    return <main className="mx-auto max-w-2xl px-4 py-8"><Link href="/home" className="text-sm font-bold text-slate-600">← Home</Link><p className="mt-6">Die Bierkasse ist in diesem Verein nicht aktiviert.</p></main>;
  }
  const names = new Map(((players ?? []) as PlayerRow[]).map(p => [p.id, p.nickname?.trim() || [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.name || "Spieler"]));
  const totals = new Map<number, number>();
  for (const beer of (beers ?? []) as BeerRow[]) totals.set(beer.player_id, (totals.get(beer.player_id) ?? 0) + Number(beer.quantity || 0));
  const ranking = [...totals.entries()].map(([id, count]) => ({ id, count, name: names.get(id) ?? "Spieler" })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "de"));
  return <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
    <Link href="/home" className="text-sm font-bold text-slate-600">← Home</Link>
    <header className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-xs font-black uppercase tracking-widest text-amber-700">🍺 Bierkasse</p>
      <h1 className="mt-1 text-2xl font-black text-slate-950">Bier-Rangliste</h1>
      <p className="mt-2 text-sm text-slate-600">Nur bestätigte Bierbuchungen. Offene und stornierte Zahlungen zählen nicht.</p>
    </header>
    {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">Die Rangliste konnte nicht geladen werden.</p> : ranking.length === 0 ? <p className="rounded-xl bg-white p-5 text-sm text-slate-600">Noch keine bestätigten Biere.</p> : <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {ranking.map((entry, index) => <div key={entry.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
        <span className="w-10 text-lg font-black text-amber-700">{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1 + "."}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">{entry.name}</span>
        <span className="shrink-0 text-sm font-black text-slate-950">{entry.count} 🍺</span>
      </div>)}
    </section>}
    <Link href="/mannschaftskasse/bier" className="block rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-sm font-bold text-amber-900">Zur Bierkasse →</Link>
  </main>;
}
