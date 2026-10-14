import Link from "next/link";
import { requirePowerUser } from "@/lib/auth/power-user";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
type Club = { id:string; display_name:string|null; name:string|null };
type Member = { club_id:string; user_id:string; role:string|null };
type Player = { id:number; club_id:string; user_id:string|null; first_name:string|null; last_name:string|null; nickname:string|null; name:string|null; can_lead_training:boolean|null };
const PILOT = "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60";
const permissions = [
  ["Eigene Zu-/Absage",true,true,true,true],
  ["Teilnehmer und Teams ansehen",true,true,true,true],
  ["Anwesenheit anderer pflegen",false,true,true,true],
  ["Teams generieren / bearbeiten",false,true,true,true],
  ["Ergebnisse erfassen / korrigieren",false,true,true,true],
  ["Termine anlegen / löschen",false,false,true,true],
  ["Club-Einstellungen verwalten",false,false,true,true],
  ["Poweruser-Support und Clubwechsel",false,false,false,true],
] as const;
export default async function PermissionsPage({searchParams}:{searchParams:Promise<{club?:string}>}) {
  await requirePowerUser();
  const admin=createAdminClient();
  const [{data:clubs,error:clubError},{data:members,error:memberError},{data:players,error:playerError}]=await Promise.all([
    admin.from("clubs").select("id, display_name, name").order("display_name"),
    admin.from("club_memberships").select("club_id,user_id,role"),
    admin.from("players").select("id,club_id,user_id,first_name,last_name,nickname,name,can_lead_training").eq("is_guest",false),
  ]);
  if(clubError||memberError||playerError) return <main className="p-6 text-red-700">Berechtigungen konnten nicht geladen werden: {clubError?.message||memberError?.message||playerError?.message}</main>;
  const allClubs=(clubs||[]) as Club[];
  const params=await searchParams;
  const selected=allClubs.find(c=>c.id===params.club)||allClubs.find(c=>c.id===PILOT)||allClubs[0];
  const clubMembers=((members||[]) as Member[]).filter(m=>m.club_id===selected?.id);
  const clubPlayers=((players||[]) as Player[]).filter(p=>p.club_id===selected?.id);
  const rows=clubPlayers.map(p=>{
    const role=clubMembers.find(m=>m.user_id===p.user_id)?.role??null;
    const adminRole=role==="admin";
    const lead=selected?.id===PILOT&&p.can_lead_training===true;
    return {p,role,adminRole,lead,name:p.nickname||[p.first_name,p.last_name].filter(Boolean).join(" ")||p.name||`Spieler #${p.id}`};
  }).sort((a,b)=>a.name.localeCompare(b.name,"de"));
  return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
    <div><Link href="/power-user" className="text-sm font-semibold text-slate-500">← Poweruser-Dashboard</Link><h1 className="mt-3 text-2xl font-black text-slate-950">Berechtigungen & Rollen</h1><p className="mt-2 text-sm text-slate-600">Live-Übersicht: Wer darf was? Clubrollen und Trainingsleitung werden aus der Datenbank gelesen.</p></div>
    <form method="get" className="rounded-2xl border border-slate-200 bg-white p-4"><label htmlFor="club" className="mb-2 block text-sm font-bold">Verein auswählen</label><div className="flex gap-2"><select id="club" name="club" defaultValue={selected?.id} className="min-w-0 flex-1 rounded-xl border border-slate-300 p-2 text-sm">{allClubs.map(c=><option key={c.id} value={c.id}>{c.display_name||c.name||c.id}</option>)}</select><button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Anzeigen</button></div></form>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b p-4"><h2 className="font-bold">Rollenmatrix</h2><p className="text-xs text-slate-500">✓ erlaubt · – nicht erlaubt. Trainingsleitung derzeit nur im Pilotverein.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs sm:text-sm"><thead className="bg-slate-50"><tr>{["Funktion","Spieler","Trainingsleitung","Admin","Poweruser"].map(x=><th key={x} className="p-3 font-bold">{x}</th>)}</tr></thead><tbody>{permissions.map(([name,...flags])=><tr key={name} className="border-t"><td className="p-3 font-medium">{name}</td>{flags.map((v,i)=><td key={i} className="p-3">{v?<span className="font-bold text-emerald-700">✓</span>:<span className="text-slate-400">–</span>}</td>)}</tr>)}</tbody></table></div></section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b p-4"><h2 className="font-bold">Mitglieder: {selected?.display_name||selected?.name||"Verein"} ({rows.length})</h2><p className="text-xs text-slate-500">Aktuelle Rollen und effektive Trainingsleitungsrechte. Gäste und nicht verknüpfte Accounts sind gesondert zu prüfen.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[670px] text-left text-sm"><thead className="bg-slate-50 text-xs"><tr>{["Spieler","Clubrolle","Trainingsleitung","Anwesenheit","Teams","Ergebnisse","Clubverwaltung"].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{rows.map(({p,name,role,adminRole,lead})=>{const canRun=adminRole||lead;return <tr key={p.id} className="border-t"><td className="p-3 font-semibold"><Link href={`/players/${p.id}`} className="text-cyan-700 hover:underline">{name}</Link>{!p.user_id?<div className="text-[10px] font-normal text-amber-700">Kein Login verknüpft</div>:null}</td><td className="p-3">{role==="admin"?"Admin":role||"Spieler"}</td><td className="p-3">{lead?"✓ Aktiv":"–"}</td>{[canRun,canRun,canRun,adminRole].map((v,i)=><td key={i} className="p-3">{v?<span className="font-bold text-emerald-700">✓</span>:<span className="text-slate-400">–</span>}</td>)}</tr>})}</tbody></table></div>{rows.length===0?<p className="p-4 text-sm text-slate-500">Keine Spieler vorhanden.</p>:null}</section>
    <p className="text-xs text-slate-500">Hinweis: Poweruser-Rechte sind globale Sonderrechte und nicht als Clubrolle in der Mitgliedertabelle hinterlegt. Diese Übersicht zeigt die fachlichen Standardberechtigungen, keine vollständige Auflistung aller API-Endpunkte.</p>
  </main>;
}
