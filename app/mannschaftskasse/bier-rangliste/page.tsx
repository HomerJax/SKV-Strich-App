import Link from "next/link";
import BeerWorkflowHelp from "@/components/cashbox/BeerWorkflowHelp";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getClubBillingAccess } from "@/lib/billing/club-billing";

type BeerRow = { player_id: number; quantity: number; created_at: string; payment_method: string | null };
type PlayerRow = { id: number; name: string | null; nickname: string | null; first_name: string | null; last_name: string | null };

type SeasonRow = { id:number; name:string|null; start_date:string|null; end_date:string|null };
export default async function BeerLeaderboardPage({ searchParams }: { searchParams?: Promise<{ view?: string; season?: string }> }) {
  const { clubId } = await requireClub();
  const supabase = await createClient();
  const params = await searchParams;
  const billing = await getClubBillingAccess(supabase, clubId);
  const [{ data: settings }, { data: seasons }, { data: players }] = await Promise.all([
    supabase.from("club_settings").select("beerkasse_enabled").eq("club_id", clubId).maybeSingle(),
    supabase.from("seasons").select("id,name,start_date,end_date").eq("club_id",clubId).order("start_date",{ascending:false}),
    supabase.from("players").select("id,name,nickname,first_name,last_name").eq("club_id", clubId).eq("is_guest", false),
  ]);
  if (!settings?.beerkasse_enabled) {
    return <main className="mx-auto max-w-2xl px-4 py-8"><Link href="/home" className="text-sm font-bold text-slate-600">← Home</Link><p className="mt-6">Die Bierkasse ist in diesem Verein nicht aktiviert.</p></main>;
  }
  const seasonList = ((seasons ?? []) as SeasonRow[]).filter(s => s.start_date && s.end_date);
  const today = new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const currentSeason = seasonList.find(s => s.start_date! <= today && s.end_date! >= today) ?? seasonList[0];
  const requestedSeason = seasonList.find(s => String(s.id) === params?.season);
  const selectedSeason = (billing.isPro ? requestedSeason : null) ?? currentSeason;
  const lifetime = params?.view === "all" && billing.isPro;
  const seasonStart = selectedSeason?.start_date ?? null;
  const seasonEnd = selectedSeason?.end_date ?? null;
  // Page through confirmed entries: Supabase's default row cap must not truncate the all-time ranking.
  const allBeers: BeerRow[] = [];
  let loadError = false;
  for (let offset = 0; offset < 100000; offset += 500) {
    let query = supabase.from("beer_consumptions").select("player_id,quantity,created_at,payment_method")
      .eq("club_id",clubId).eq("payment_status","paid").is("cancelled_at",null).order("created_at",{ascending:false}).range(offset,offset+499);
    if (!lifetime) {
      if (seasonStart) query = query.gte("created_at",seasonStart+"T00:00:00");
      if (seasonEnd) query = query.lt("created_at",new Date(Date.parse(seasonEnd+"T00:00:00Z")+86400000).toISOString().slice(0,10)+"T00:00:00");
      if (!selectedSeason) query = query.lt("created_at","1900-01-01T00:00:00Z");
    }
    const {data,error:pageError}=await query;
    if (pageError) { loadError=true; break; }
    allBeers.push(...((data??[]) as BeerRow[]));
    if (!data || data.length < 500) break;
  }
  const error = loadError;
  const names = new Map(((players ?? []) as PlayerRow[]).map(p => [p.id, p.nickname?.trim() || [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.name || "Spieler"]));
  const totals = new Map<number, number>();
  const history = new Map<number, BeerRow[]>();
  for (const beer of allBeers) {
    totals.set(beer.player_id, (totals.get(beer.player_id) ?? 0) + Number(beer.quantity || 0));
    history.set(beer.player_id, [...(history.get(beer.player_id) ?? []), beer]);
  }
  for (const entries of history.values()) entries.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const ranking = [...totals.entries()].map(([id, count]) => ({ id, count, name: names.get(id) ?? "Spieler" })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "de"));
  return <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
    <Link href="/home" className="text-sm font-bold text-slate-600">← Home</Link>
    <header className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-xs font-black uppercase tracking-widest text-amber-700">🍺 Bierkasse</p>
      <h1 className="mt-1 text-2xl font-black text-slate-950">{lifetime ? "Ewige Bier-Tabelle" : "Bier-Rangliste"}</h1>
      <p className="mt-2 text-sm text-slate-600">Nur bestätigte Bierbuchungen. Offene und stornierte Zahlungen zählen nicht.</p>
    </header>
    <BeerWorkflowHelp audience="ranking" />
    <nav className="flex flex-wrap gap-2">
      <Link href="/mannschaftskasse/bier-rangliste" className={`rounded-xl px-4 py-2 text-sm font-bold ${!lifetime?"bg-teal-700 text-white":"bg-slate-100 text-slate-700"}`}>Saison</Link>
      {billing.isPro ? <Link href="/mannschaftskasse/bier-rangliste?view=all" className={`rounded-xl px-4 py-2 text-sm font-bold ${lifetime?"bg-teal-700 text-white":"bg-slate-100 text-slate-700"}`}>Ewige Tabelle · PRO</Link> : <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-400">🔒 Ewige Tabelle · PRO</span>}
    </nav>
    {!lifetime && billing.isPro && seasonList.length>0 ? <div className="flex flex-wrap gap-2">{seasonList.map(season=><Link key={season.id} href={`/mannschaftskasse/bier-rangliste?season=${season.id}`} className={`rounded-lg border px-3 py-2 text-xs font-bold ${selectedSeason?.id===season.id?"border-teal-600 bg-teal-50 text-teal-800":"border-slate-200 text-slate-600"}`}>{season.name||"Saison"} · {season.start_date}</Link>)}</div> : null}
    {!lifetime && !selectedSeason ? <p className="text-sm text-slate-500">Noch keine Vereinssaison angelegt.</p> : null}
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
