import Link from "next/link";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { canAddFixedPlayer } from "@/lib/billing/product-limits";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import SetupWizard from "@/components/admin/SetupWizard";
import ClubSettingsCard from "@/components/admin/settings/ClubSettingsCard";
import SeasonSettingsCard from "@/components/admin/settings/SeasonSettingsCard";
import TeamGeneratorSettingsCard from "@/components/admin/settings/TeamGeneratorSettingsCard";
import { CategorySettingsSection } from "@/components/admin/settings/CategorySettingsSection";
import WizardRsvpForm from "@/components/admin/WizardRsvpForm";
import { getClubBillingAccess } from "@/lib/billing/club-billing";

export default async function AdminSetupPage() {
 const ctx=await getAuthContext();
 if(!ctx.user) redirect("/login");
 if(!ctx.activeClubId) redirect("/select-club");
 const membership=ctx.memberships.find(m=>m.club_id===ctx.activeClubId);
 if(!ctx.isPowerUser && membership?.role!=="admin") redirect("/home");
 const db=await createClient(),clubId=ctx.activeClubId;
 async function addWizardPlayer(formData:FormData){
  "use server";
  const auth=await getAuthContext();
  if(!auth.user||!auth.activeClubId)redirect("/login");
  const member=auth.memberships.find(m=>m.club_id===auth.activeClubId);
  if(!auth.isPowerUser&&member?.role!=="admin")redirect("/home");
  const supabase=await createClient();
  if(!await canAddFixedPlayer(supabase,auth.activeClubId))redirect("/admin/setup?step=players&error=limit");
  const first=String(formData.get("first_name")??"").trim().slice(0,80);
  const last=String(formData.get("last_name")??"").trim().slice(0,80);
  const nick=String(formData.get("nickname")??"").trim().slice(0,80);
  const name=nick||[first,last].filter(Boolean).join(" ");
  if(!name)redirect("/admin/setup?step=players&error=name");
  const {error}=await supabase.from("players").insert({club_id:auth.activeClubId,name,first_name:first||null,last_name:last||null,nickname:nick||null,age_group:"AH",preferred_position:"attack",is_active:true,strength:null});
  if(error)redirect("/admin/setup?step=players&error=save");
  redirect("/admin/setup?step=players&saved=1");
 }

 const [club,seasons,players,sessions,leaders,leaderCandidates,settings,categories,billing,progress]=await Promise.all([
  db.from("clubs").select("display_name").eq("id",clubId).maybeSingle(),
  db.from("seasons").select("id").eq("club_id",clubId).limit(1),
  db.from("players").select("id").eq("club_id",clubId).limit(2),
  db.from("sessions").select("id,series_id").eq("club_id",clubId).limit(100),
  db.from("players").select("id").eq("club_id",clubId).eq("can_lead_training",true).limit(1),
  db.from("players").select("id,name,can_lead_training").eq("club_id",clubId).eq("is_active",true).order("name").limit(100),
  db.from("club_settings").select("use_strength,use_categories,rsvp_deadline_minutes_before,require_rsvp_reason_on_absence").eq("club_id",clubId).maybeSingle(),
  db.from("club_categories").select("id,key,label,sort_order,is_active,is_strong").eq("club_id",clubId).order("sort_order",{ascending:true}),
  getClubBillingAccess(db,clubId),
  db.from("admin_setup_progress").select("current_step,skipped,test_mode,test_completed,reviewed").eq("club_id",clubId).eq("user_id",ctx.user.id).maybeSingle()
 ]);
 async function updateWizardLeader(formData:FormData){
  "use server";
  const auth=await getAuthContext();
  if(!auth.user||!auth.activeClubId)redirect("/login");
  const member=auth.memberships.find(m=>m.club_id===auth.activeClubId);
  if(!auth.isPowerUser&&member?.role!=="admin")redirect("/home");
  const playerId=String(formData.get("player_id")??"");
  const enabled=formData.get("enabled")==="1";
  const supabase=await createClient();
  const {error}=await supabase.from("players").update({can_lead_training:enabled}).eq("club_id",auth.activeClubId).eq("id",playerId);
  redirect(error?"/admin/setup?step=leaders&error=save":"/admin/setup?step=leaders&saved=1");
 }
 async function addWizardTraining(formData:FormData){
  "use server";
  const auth=await getAuthContext();
  if(!auth.user||!auth.activeClubId)redirect("/login");
  const member=auth.memberships.find(m=>m.club_id===auth.activeClubId);
  if(!auth.isPowerUser&&member?.role!=="admin")redirect("/home");
  const date=String(formData.get("date")??"");
  const time=String(formData.get("start_time")??"");
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)||!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(time))redirect("/admin/setup?step=training&error=date");
  const supabase=await createClient();
  const {data:season}=await supabase.from("seasons").select("id").eq("club_id",auth.activeClubId).lte("start_date",date).gte("end_date",date).limit(1).maybeSingle();
  if(!season)redirect("/admin/setup?step=training&error=season");
  const {error}=await supabase.from("sessions").insert({club_id:auth.activeClubId,date,start_time:time,season_id:season.id,type:"training",notes:String(formData.get("notes")??"").slice(0,500)||null});
  redirect(error?"/admin/setup?step=training&error=save":"/admin/setup?step=training&saved=1");
 }
 async function addWizardSeries(formData:FormData){
  "use server";
  const auth=await getAuthContext();
  if(!auth.user||!auth.activeClubId)redirect("/login");
  const member=auth.memberships.find(m=>m.club_id===auth.activeClubId);
  if(!auth.isPowerUser&&member?.role!=="admin")redirect("/home");
  const start=String(formData.get("start_date")??"");
  const end=String(formData.get("end_date")??"");
  const time=String(formData.get("start_time")??"");
  const weekdays=String(formData.get("weekday")??"");
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(start)||!/^\\d{4}-\\d{2}-\\d{2}$/.test(end)||!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(time)||! /^[0-6]$/.test(weekdays)||end<start)redirect("/admin/setup?step=series&error=date");
  const db=await createClient();
  const {data:season}=await db.from("seasons").select("id,start_date,end_date").eq("club_id",auth.activeClubId).lte("start_date",start).gte("end_date",end).limit(1).maybeSingle();
  if(!season)redirect("/admin/setup?step=series&error=season");
  if(end>season.end_date||start<season.start_date)redirect("/admin/setup?step=series&error=season_range");
  const dates:string[]=[];
  const cursor=new Date(start+"T12:00:00Z"),last=new Date(end+"T12:00:00Z");
  while(cursor<=last&&dates.length<53){if(cursor.getUTCDay()===Number(weekdays))dates.push(cursor.toISOString().slice(0,10));cursor.setUTCDate(cursor.getUTCDate()+1)}
  if(!dates.length||dates.length>52||cursor<=last)redirect("/admin/setup?step=series&error=range");
  const {data:existing,error:lookupError}=await db.from("sessions").select("date").eq("club_id",auth.activeClubId).in("date",dates).or("type.eq.training,type.is.null");
  if(lookupError)redirect("/admin/setup?step=series&error=save");
  const seen=new Set((existing??[]).map(x=>x.date));
  const newDates=dates.filter(x=>!seen.has(x));
  if(!newDates.length)redirect("/admin/setup?step=series&error=existing");
  const seriesId=randomUUID();
  const {error}=await db.from("sessions").insert(newDates.map((date,i)=>({club_id:auth.activeClubId,date,start_time:time,season_id:season.id,type:"training",series_id:seriesId,series_index:i+1})));
  redirect(error?"/admin/setup?step=series&error=save":"/admin/setup?step=series&saved=1");
 }
 const hasSeason=(seasons.data?.length??0)>0;
 const hasPlayers=(players.data?.length??0)>=2;
 const hasTraining=(sessions.data?.length??0)>0;
 const hasSeries=(sessions.data??[]).some(s=>s.series_id!==null);
 const steps=[
  {id:"club",title:"Vereinsgrunddaten",description:"Name, Sportart, Logo und Vereinsfarbe festlegen.",required:true,done:!!club.data?.display_name,href:"/admin/settings?from=setup"},
  {id:"players",title:"Mitspieler einladen",description:"Teile den Einladungslink über WhatsApp. Deine Mitspieler treten selbst bei – kein manuelles Anlegen nötig.",required:false,done:hasPlayers,href:"/admin/players?from=setup"},
  {id:"training",title:"Trainingsbetrieb einrichten",description:"Lege Wochentage und Uhrzeiten fest und plane die Trainingsserie innerhalb der strikr-Saison.",required:true,done:hasSeries||hasTraining,href:"/sessions/new?from=setup"},
  {id:"leaders",title:"Trainingsleiter",description:"Erlaube weiteren Spielern, Trainings durchzuführen.",required:false,done:(leaders.data?.length??0)>0,href:"/admin/members?from=setup"},
  {id:"teams",title:"Faire Teams und Spielstärken",description:"Bestimme, wie strikr eure Teams fair einteilt.",required:false,done:false,href:"/admin/settings?from=setup"},
  {id:"categories",title:"Spielerkategorien",description:"Ordne Spieler in passende Gruppen ein.",required:false,done:false,href:"/admin/settings?from=setup"},
  {id:"rsvp",title:"Zu- und Absagen",description:"Passe die Fristen und Rückmeldungen für eure Termine an.",required:false,done:false,href:"/admin/settings?from=setup"},
  {id:"games",title:"Spiele, Turniere und Spieluhr",description:"Entdecke die Möglichkeiten für Spiele und Ergebnisse.",required:false,done:false,href:"/admin/game-timer?from=setup",pro:true},
  {id:"stats",title:"Statistiken und Auszeichnungen",description:"Lerne Tabellen, MVP und Saisonstatistiken kennen.",required:false,done:false,href:"/admin/settings?from=setup"},
  {id:"cashbox",title:"Mannschaftskasse",description:"Richte Beiträge und Strafen für euer Team ein.",required:false,done:false,href:"/mannschaftskasse?from=setup"},
  {id:"notifications",title:"Kommunikation",description:"Entdecke Ankündigungen und Benachrichtigungen.",required:false,done:false,href:"/admin/announcements?from=setup"},
  {id:"season",title:"Saison & individuelle Zeiträume",description:"Die strikr-Standardsaison gilt automatisch. Eigene Saisonzeiträume sind ausschließlich mit PRO möglich.",required:false,done:hasSeason,href:"/admin/settings?from=setup",pro:true},
  {id:"pro",title:"PRO-Funktionen",description:"Sieh dir zusätzliche Möglichkeiten für euren Verein an.",required:false,done:false,href:"/admin/settings?from=setup",pro:true},
 ];
 return <main className="min-h-screen bg-slate-100 px-4 py-6"><div className="mx-auto max-w-3xl"><Link href="/admin" className="mb-4 inline-block text-sm font-semibold text-slate-600">← Admin-Bereich</Link><SetupWizard clubId={clubId} clubName={club.data?.display_name||"Dein Verein"} steps={steps} inlinePanels={{club:<ClubSettingsCard redirectTo="/admin/setup?step=club" removeLogoRedirectTo="/admin/setup?step=club"/>,players:<form action={addWizardPlayer} className="space-y-3"><p className="text-sm font-bold">Spieler direkt hinzufügen</p><input name="first_name" placeholder="Vorname" className="w-full rounded-xl border p-3"/><input name="last_name" placeholder="Nachname" className="w-full rounded-xl border p-3"/><input name="nickname" placeholder="Spitzname (optional)" className="w-full rounded-xl border p-3"/><button type="submit" className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">Spieler speichern</button></form>,season:<SeasonSettingsCard redirectTo="/admin/setup?step=season"/>,teams:<TeamGeneratorSettingsCard useStrength={settings.data?.use_strength??false} useCategories={settings.data?.use_categories??false} redirectTo="/admin/setup?step=teams"/>,categories:<CategorySettingsSection categories={categories.data??[]} useCategories={settings.data?.use_categories??false} isPro={billing.isPro} redirectTo="/admin/setup?step=categories"/>,training:<form action={addWizardTraining} className="space-y-3"><p className="text-sm font-bold">Ersten Trainingstermin anlegen</p><label className="block text-xs font-semibold">Datum<input required name="date" type="date" className="mt-1 w-full rounded-xl border p-3"/></label><label className="block text-xs font-semibold">Beginn<input required name="start_time" type="time" defaultValue="19:00" className="mt-1 w-full rounded-xl border p-3"/></label><textarea name="notes" placeholder="Hinweise (optional)" className="w-full rounded-xl border p-3"/><button type="submit" className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">Training anlegen</button></form>,series:<form action={addWizardSeries} className="space-y-3"><p className="text-sm font-bold">Wiederkehrendes Training planen</p><label className="block text-xs font-semibold">Von<input required name="start_date" type="date" className="mt-1 w-full rounded-xl border p-3"/></label><label className="block text-xs font-semibold">Bis (maximal 52 Wochen, innerhalb einer Saison)<input required name="end_date" type="date" className="mt-1 w-full rounded-xl border p-3"/></label><label className="block text-xs font-semibold">Wochentag<select name="weekday" className="mt-1 w-full rounded-xl border p-3"><option value="1">Montag</option><option value="2">Dienstag</option><option value="3">Mittwoch</option><option value="4">Donnerstag</option><option value="5">Freitag</option><option value="6">Samstag</option><option value="0">Sonntag</option></select></label><label className="block text-xs font-semibold">Beginn<input required name="start_time" type="time" defaultValue="19:00" className="mt-1 w-full rounded-xl border p-3"/></label><button type="submit" className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">Trainingsserie anlegen</button></form>,leaders:<div className="space-y-3"><p className="text-sm font-bold">Trainingsleiter festlegen</p>{(leaderCandidates.data??[]).map(player=><form key={player.id} action={updateWizardLeader} className="flex items-center justify-between gap-3 rounded-xl border p-3"><span className="text-sm">{player.name} {player.can_lead_training?"· Leiter":""}</span><input type="hidden" name="player_id" value={player.id}/><input type="hidden" name="enabled" value={player.can_lead_training?"0":"1"}/><button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">{player.can_lead_training?"Entfernen":"Als Leiter einsetzen"}</button></form>)}</div>,rsvp:<WizardRsvpForm value={settings.data?.rsvp_deadline_minutes_before??30} reason={settings.data?.require_rsvp_reason_on_absence??false} isPro={billing.isPro}/>}} initial={progress.data} allowTest={ctx.isPowerUser&&club.data?.display_name==="1. FC Strikr 2026"}/></div></main>;
}
