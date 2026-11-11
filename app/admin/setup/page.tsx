import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Circle, ArrowRight } from "lucide-react";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSetupPage() {
  const ctx = await getAuthContext();
  if (!ctx.user) redirect("/login");
  if (!ctx.activeClubId) redirect("/select-club");
  const membership = ctx.memberships.find(m => m.club_id === ctx.activeClubId);
  if (!ctx.isPowerUser && membership?.role !== "admin") redirect("/home");

  const db = await createClient();
  const clubId = ctx.activeClubId;
  const [clubResult, seasonsResult, seriesResult, leadersResult, playersResult] = await Promise.all([
    db.from("clubs").select("display_name").eq("id", clubId).maybeSingle(),
    db.from("seasons").select("id").eq("club_id", clubId).limit(1),
    db.from("sessions").select("id").eq("club_id", clubId).not("series_id", "is", null).limit(1),
    db.from("players").select("id").eq("club_id", clubId).eq("can_lead_training", true).limit(1),
    db.from("players").select("id").eq("club_id", clubId).limit(2),
  ]);
  const items = [
    { title: "Saison definieren", detail: "Lege euren Saisonzeitraum fest.", done: (seasonsResult.data?.length ?? 0) > 0, href: "/admin/settings?from=setup" },
    { title: "Trainingsserie erstellen", detail: "Richte einen regelmäßigen Trainingstermin ein.", done: (seriesResult.data?.length ?? 0) > 0, href: "/sessions/new?from=setup" },
    { title: "Trainingsleiter bestimmen", detail: "Bestimme, wer eure Trainings leiten darf.", done: (leadersResult.data?.length ?? 0) > 0, href: "/admin/members?from=setup" },
    { title: "Spieler hinzufügen", detail: "Füge weitere Spieler zu eurem Kader hinzu.", done: (playersResult.data?.length ?? 0) >= 2, href: "/admin/players?from=setup" },
  ];
  const count = items.filter(i => i.done).length;
  return <main className="min-h-screen bg-slate-100 px-4 py-6">
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/admin" className="text-sm font-semibold text-slate-600">← Admin-Bereich</Link>
      <div className="rounded-[26px] bg-slate-950 p-6 text-white">
        <div className="text-xs font-bold uppercase tracking-widest text-cyan-300">strikr · Einrichtung</div>
        <h1 className="mt-2 text-2xl font-black">Dein Verein wird startklar.</h1>
        <p className="mt-2 text-sm text-white/65">{clubResult.data?.display_name || "Dein Verein"} · {count} von {items.length} Aufgaben erledigt</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-cyan-400 transition-all" style={{width: `${count / items.length * 100}%`}} /></div>
      </div>
      <div className="space-y-3">{items.map(item => <div key={item.title} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className={item.done ? "text-emerald-600" : "text-slate-300"}>{item.done ? <Check className="h-6 w-6"/> : <Circle className="h-6 w-6"/>}</span>
        <div className="min-w-0 flex-1"><h2 className="text-sm font-bold text-slate-950">{item.title}</h2><p className="mt-1 text-xs text-slate-500">{item.done ? "Erledigt" : item.detail}</p></div>
        <Link href={item.href} className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900">{item.done ? "Ansehen" : "Erledigen"} <ArrowRight className="h-3.5 w-3.5"/></Link>
      </div>)}</div>
      <p className="text-xs leading-5 text-slate-500">Die Häkchen werden bei jedem Aufruf anhand der Vereinsdaten neu geprüft. Die Häkchen aktualisieren sich nach dem Speichern und erneuten Öffnen dieser Seite.</p>
    </div>
  </main>;
}
