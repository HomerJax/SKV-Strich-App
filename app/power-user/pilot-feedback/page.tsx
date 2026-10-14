import Link from "next/link";
import { requirePowerUser } from "@/lib/auth/power-user";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
type ResponseRow = {id:string;user_id:string;club_id:string;submitted_at:string;answers:Record<string,string>|null};
const QUESTIONS: [string,string][] = [
 ["usage","Nutzung im Trainingsalltag"],["useful","Größter Mehrwert"],["useful_other","Mehrwert – Sonstiges"],
 ["other_organization","Weitere Organisation"],["other_organization_other","Weitere Organisation – Details"],
 ["positive","Was gefällt dem Admin?"],["issues","Was nervt den Admin?"],
 ["players_positive","Was gefällt den Spielern?"],["players_negative","Was kritisieren die Spieler?"],
 ["fairness","Fairness der Teams"],["missing","Fehlende Funktionen"],["price","Monatlicher Team-Preis"],
 ["recommend","Weiterempfehlung"],["other","Weitere Anmerkungen"]
];
const PILOTS=[{user:"803ed713-04bb-40b5-9990-a0e02f0e505f",club:"92a02874-934f-4e3d-8fc9-543b01c43c16",name:"Marc Pendl",team:"TSV Münchingen Ü32"},
{user:"2a6421b1-dfaa-4c17-a5ce-adfc758c11d7",club:"b8d4b692-baf1-4263-8fdd-64df424114a7",name:"Stefan Heimerdinger",team:"SpVgg Renningen"}];
export default async function PilotFeedbackOverview(){
 await requirePowerUser();
 const admin=createAdminClient();
 const {data,error}=await admin.from("pilot_admin_feedback").select("id,user_id,club_id,submitted_at,answers").order("submitted_at",{ascending:false}).limit(100);
 if(error)throw new Error("Pilotfeedback konnte nicht geladen werden: "+error.message);
 const responses=(data??[]) as ResponseRow[];
 const latest=new Map(responses.map(r=>[r.user_id,r]));
 const received=PILOTS.filter(p=>latest.has(p.user)).length;
 const section="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
 return <main className="min-h-screen bg-slate-50 pb-20"><div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
 <Link href="/power-user" className="inline-block rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">← Power User Dashboard</Link>
 <header className={section}><p className="text-xs font-bold uppercase tracking-widest text-slate-500">strikr · Power User</p><h1 className="mt-2 text-3xl font-extrabold text-slate-950">Pilotteams Feedback</h1><p className="mt-2 text-slate-600">Rückmeldungen von Marc und Stefan – direkt aus der Datenbank.</p><div className="mt-4 text-2xl font-black">{received} / {PILOTS.length} <span className="text-sm font-normal text-slate-500">Antworten eingegangen</span></div></header>
 <div className="grid gap-4 sm:grid-cols-2">{PILOTS.map(p=>{const r=latest.get(p.user);return <article key={p.user} className={section}><h2 className="font-bold">{p.name}</h2><p className="text-sm text-slate-600">{p.team}</p><p className="mt-3 text-sm font-semibold">{r?"✓ Eingegangen":"Noch ausstehend"}</p>{r&&<p className="mt-1 text-xs text-slate-500">{new Date(r.submitted_at).toLocaleString("de-DE",{timeZone:"Europe/Berlin"})}</p>}</article>})}</div>
 {received===0?<div className={section}>Noch keine Antworten vorhanden. Sobald ein Pilotadmin den Fragebogen absendet, erscheint seine Rückmeldung hier.</div>:<>
 <section className={section}><h2 className="text-xl font-bold">Antworten im Vergleich</h2><p className="mt-1 text-sm text-slate-500">Offene Antworten bleiben vollständig sichtbar.</p><div className="mt-4 space-y-4">{QUESTIONS.map(([key,label])=><div key={key} className="rounded-xl border border-slate-100 p-4"><h3 className="font-semibold text-slate-900">{label}</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{PILOTS.map(p=><div key={p.user} className="rounded-lg bg-slate-50 p-3"><p className="mb-1 text-xs font-bold text-slate-500">{p.name}</p><p className="whitespace-pre-wrap break-words text-sm text-slate-800">{latest.get(p.user)?.answers?.[key]?.trim()||"–"}</p></div>)}</div></div>)}</div></section>
 <section className={section}><h2 className="text-xl font-bold">Preisbereitschaft & Empfehlung</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{PILOTS.map(p=><div key={p.user} className="rounded-xl bg-slate-50 p-4"><h3 className="font-semibold">{p.team}</h3><p className="mt-2 text-sm">Preis: {latest.get(p.user)?.answers?.price||"–"}</p><p className="mt-1 text-sm">Empfehlung: {latest.get(p.user)?.answers?.recommend||"–"}</p></div>)}</div></section>
 </>}
 </div></main>;
}
