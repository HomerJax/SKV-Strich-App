import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCashboxAccess } from "@/lib/cashbox/access";

export default async function KabinenregelnPage(){
  const access=await requireCashboxAccess();
  if(!access.canManageCashbox || access.isSupportView) redirect("/mannschaftskasse");
  const items=[
    {title:"Kabinenregeln",description:"Strafen, Beträge und Regelvorlagen festlegen.",href:"/admin/penalties?tab=rules",icon:"📋"},
    {title:"Glücksrad",description:"Ergebnisse und Chancen für den Verein, einzelne Regeln oder konkrete Strafen einstellen.",href:"/mannschaftskasse/gluecksrad",icon:"🎡"},
    {title:"Offene Strafen",description:"Posten anlegen und verwalten.",href:"/admin/penalties?tab=penalties",icon:"⚖️"},
    {title:"Zahlungswege",description:"Zahlungsmöglichkeiten und Kassenstruktur verwalten.",href:"/mannschaftskasse/setup?edit=1",icon:"💳"},
  ];
  return <main className="min-h-screen bg-slate-50 px-4 py-6 pb-24"><div className="mx-auto max-w-2xl space-y-5">
    <Link href="/mannschaftskasse" className="text-sm font-semibold text-slate-600">← Mannschaftskasse</Link>
    <header><p className="text-xs font-black uppercase tracking-widest text-violet-700">Verwaltung</p><h1 className="mt-1 text-2xl font-black text-slate-950">Kabinenregeln</h1><p className="mt-2 text-sm text-slate-600">Alle Einstellungen für Strafen, Glücksrad und Begleichung an einem Ort.</p></header>
    <div className="grid gap-3">{items.map(item=><Link key={item.href} href={item.href} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl">{item.icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-black text-slate-950">{item.title}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{item.description}</span></span><span className="text-slate-400">→</span></Link>)}</div>
    <p className="text-xs text-slate-500">Die Auswahl, ob das Glücksrad pro Regel optional oder verpflichtend ist, wird noch separat ergänzt. Bestehende Pflichtregeln bleiben bis dahin unverändert.</p>
  </div></main>;
}
