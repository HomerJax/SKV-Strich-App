import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePowerUser } from "@/lib/auth/power-user";

export const dynamic = "force-dynamic";

const categories = [
  {key:"training_reminders",label:"Training & Termine"},
  {key:"rsvp_updates",label:"Zu-/Absagen"},
  {key:"results",label:"Ergebnisse"},
  {key:"badges",label:"Badges"},
  {key:"announcements",label:"Ankündigungen / Kabinen-Talk"},
] as const;

const events = [
  ["Training oder Termin angelegt","Alle Vereinsmitglieder außer Ersteller","Sofort","Training & Termine"],
  ["Terminserie angelegt","Alle Vereinsmitglieder außer Ersteller","Einmal als Sammelmeldung","Training & Termine"],
  ["Training oder Termin abgesagt","Alle Vereinsmitglieder außer Auslöser","Sofort","Training & Termine"],
  ["Spieler sagt zu oder ab","Andere Vereinsmitglieder","Bei Statusänderung","Zu-/Absagen"],
  ["Rückmeldung fehlt","Spieler ohne Zu-/Absage","Vortag; Cron täglich 17:00 UTC","Training & Termine"],
  ["Erstes Ergebnis eingetragen","Andere Vereinsmitglieder","Beim ersten Ergebnis","Ergebnisse"],
  ["Admin-Ankündigung","Vereinsmitglieder","Beim Versenden","Ankündigungen"],
  ["Bierkasse: Eintrag","Kassenverantwortliche","Bei Eintrag; derzeit ohne Präferenzfilter","Keine"],
  ["Kabinen-Talk: Biermaschine","Vereinsmitglieder","Cron täglich 21:35 UTC","Ankündigungen"],
  ["Kabinen-Talk: 3× Feier ich","Betroffener Spieler","Beim dritten Like; einmal je Ereignis","Ankündigungen"],
  ["Geburtstag / Glückwunsch","–","Kein eigener Push nachgewiesen","–"],
  ["Badge erreicht","–","Push-Auslöser noch nicht abschließend verifiziert","Badges"],
];

type Pref = {user_id:string;training_reminders:boolean;rsvp_updates:boolean;results:boolean;badges:boolean;announcements:boolean};
type Token = {user_id:string;enabled:boolean;platform:string};
type Player = {user_id:string|null;club_id:string;first_name:string|null;last_name:string|null;nickname:string|null;email:string|null};
type Club = {id:string;name:string|null;display_name:string|null};

export default async function NotificationDashboard(){
 await requirePowerUser();
 const db=createAdminClient();
 const [membersResult,prefsResult,tokensResult,playersResult,clubsResult]=await Promise.all([
  db.from("club_memberships").select("user_id,club_id"),
  db.from("push_preferences").select("user_id,training_reminders,rsvp_updates,results,badges,announcements"),
  db.from("push_subscriptions").select("user_id,enabled,platform"),
  db.from("players").select("user_id,club_id,first_name,last_name,nickname,email").not("user_id","is",null),
  db.from("clubs").select("id,name,display_name")
 ]);
 const errors=[membersResult,prefsResult,tokensResult,playersResult,clubsResult].map(r=>r.error?.message).filter(Boolean);
 const members=(membersResult.data??[]) as {user_id:string;club_id:string}[];
 const userIds=[...new Set(members.map(m=>m.user_id).filter(Boolean))].sort();
 const prefs=new Map(((prefsResult.data??[]) as Pref[]).map(p=>[p.user_id,p]));
 const tokens=(tokensResult.data??[]) as Token[];
 const players=(playersResult.data??[]) as Player[];
 const clubs=new Map(((clubsResult.data??[]) as Club[]).map(c=>[c.id,c.display_name||c.name||"Unbekannter Verein"]));
 const playersByUser=new Map<string,Player>();
 for(const p of players)if(p.user_id&&!playersByUser.has(p.user_id))playersByUser.set(p.user_id,p);
 const membershipByUser=new Map<string,string[]>();
 for(const m of members)membershipByUser.set(m.user_id,[...new Set([...(membershipByUser.get(m.user_id)??[]),clubs.get(m.club_id)??"Unbekannt"])]);
 const tokenByUser=new Map<string,Token[]>();
 for(const t of tokens)tokenByUser.set(t.user_id,[...(tokenByUser.get(t.user_id)??[]),t]);
 const totals=categories.map(c=>({label:c.label,key:c.key,enabled:userIds.filter(id=>prefs.get(id)?.[c.key]!==false).length,disabled:userIds.filter(id=>prefs.get(id)?.[c.key]===false).length,explicit:userIds.filter(id=>prefs.has(id)).length}));
 const withActiveToken=userIds.filter(id=>tokenByUser.get(id)?.some(t=>t.enabled)).length;
 const withDisabledToken=userIds.filter(id=>tokenByUser.get(id)?.length&&!tokenByUser.get(id)?.some(t=>t.enabled)).length;
 return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-7xl space-y-6">
  <Link href="/power-user" className="text-sm font-semibold text-cyan-700">← Power User Dashboard</Link>
  <header className="rounded-3xl bg-white p-6 shadow-sm"><div className="text-xs font-bold uppercase tracking-widest text-slate-500">Power User · Live-Auswertung</div><h1 className="mt-2 text-3xl font-extrabold">Notifications & Einstellungen</h1><p className="mt-2 text-sm text-slate-600">Wer bekommt wann eine Nachricht? Welche Nutzer haben Push aktiviert oder deaktiviert? Nur für Power User sichtbar.</p></header>
  {errors.length>0&&<div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm">Daten konnten nicht vollständig geladen werden: {errors.join(" · ")}</div>}
  <div className="grid gap-3 sm:grid-cols-4">{[[String(userIds.length),"Vereinsmitglieder (eindeutige Nutzer)"],[String(withActiveToken),"Mit aktivem Push-Token"],[String(withDisabledToken),"Nur deaktivierte Push-Tokens"],[String(userIds.length-withActiveToken-withDisabledToken),"Ohne registriertes Push-Token"]].map(([value,label])=><div key={label} className="rounded-2xl bg-white p-5 shadow-sm"><div className="text-3xl font-extrabold">{value}</div><div className="mt-1 text-xs text-slate-600">{label}</div></div>)}</div>
  <section className="rounded-3xl bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Einstellungen nach Kategorie</h2><p className="mt-1 text-xs text-slate-500">Ohne gespeicherte Einstellungen gilt in strikr standardmäßig „aktiviert“. Das ist keine Aussage über die Systemberechtigung auf dem Handy.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{totals.map(c=><div key={c.key} className="rounded-xl border border-slate-200 p-4"><div className="text-sm font-semibold">{c.label}</div><div className="mt-3 text-lg font-bold text-emerald-700">{c.enabled} an</div><div className="text-sm font-bold text-rose-700">{c.disabled} aus</div><div className="mt-2 text-xs text-slate-500">{userIds.length-c.explicit} ohne gespeicherte Auswahl</div></div>)}</div></section>
  <section className="overflow-hidden rounded-3xl bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Notification-Matrix</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b bg-slate-50">{["Auslöser","Empfänger","Zeitpunkt","Einstellung"].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{events.map((e,i)=><tr key={i} className="border-b border-slate-100">{e.map((v,j)=><td key={j} className="p-3 align-top">{v}</td>)}</tr>)}</tbody></table></div></section>
  <section className="overflow-hidden rounded-3xl bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Nutzer im Detail</h2><p className="mt-1 text-xs text-slate-500">An/Aus = gespeicherte oder standardmäßige strikr-Präferenz. „Push-Token“ zeigt, ob ein aktives Gerät registriert ist. Auch ein aktiver Token garantiert keine Zustellung.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-xs"><thead><tr className="border-b bg-slate-50">{["Nutzer","Verein","Push-Token",...categories.map(c=>c.label)].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{userIds.map(id=>{const p=playersByUser.get(id);const ts=tokenByUser.get(id)??[];const tokenLabel=ts.some(t=>t.enabled)?"Aktiv ("+[...new Set(ts.filter(t=>t.enabled).map(t=>t.platform))].join(", ")+")":ts.length?"Deaktiviert":"Nicht registriert";return <tr key={id} className="border-b border-slate-100"><td className="p-3 font-semibold">{p?.nickname||[p?.first_name,p?.last_name].filter(Boolean).join(" ")||p?.email||id.slice(0,8)}</td><td className="p-3">{(membershipByUser.get(id)??[]).join(", ")}</td><td className="p-3">{tokenLabel}</td>{categories.map(c=><td key={c.key} className={"p-3 font-semibold "+(prefs.get(id)?.[c.key]===false?"text-rose-700":"text-emerald-700")}>{prefs.get(id)?.[c.key]===false?"Aus":prefs.has(id)?"An":"An (Standard)"}</td>)}</tr>})}</tbody></table></div></section>
 </div></main>;
}
