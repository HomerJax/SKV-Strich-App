import Link from "next/link";
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

 const [club,seasons,players,sessions,leaders,settings,categories,billing,progress]=await Promise.all([
  db.from("clubs").select("display_name").eq("id",clubId).maybeSingle(),
  db.from("seasons").select("id").eq("club_id",clubId).limit(1),
  db.from("players").select("id").eq("club_id",clubId).limit(2),
  db.from("sessions").select("id,series_id").eq("club_id",clubId).limit(100),
  db.from("players").select("id").eq("club_id",clubId).eq("can_lead_training",true).limit(1),
  db.from("club_settings").select("use_strength,use_categories,rsvp_deadline_minutes_before,require_rsvp_reason_on_absence").eq("club_id",clubId).maybeSingle(),
  db.from("club_categories").select("id,key,label,sort_order,is_active,is_strong").eq("club_id",clubId).order("sort_order",{ascending:true}),
  getClubBillingAccess(db,clubId),
  db.from("admin_setup_progress").select("current_step,skipped,test_mode,test_completed,reviewed").eq("club_id",clubId).eq("user_id",ctx.user.id).maybeSingle()
 ]);
 const hasSeason=(seasons.data?.length??0)>0;
 const hasPlayers=(players.data?.length??0)>=2;
 const hasTraining=(sessions.data?.length??0)>0;
 const hasSeries=(sessions.data??[]).some(s=>s.series_id!==null);
 const steps=[
  {id:"club",title:"Vereinsgrunddaten",description:"Name, Sportart, Logo und Vereinsfarbe festlegen.",required:true,done:!!club.data?.display_name,href:"/admin/settings?from=setup"},
  {id:"season",title:"Saison festlegen",description:"Pflicht für eure Statistik: Die strikr-Standardsaison verwenden oder mit PRO eine individuelle Saison konfigurieren.",required:true,done:hasSeason,href:"/admin/settings?from=setup",pro:true},
  {id:"players",title:"Spieler hinzufügen",description:"Lege euren Kader an oder lade deine Mitspieler ein.",required:true,done:hasPlayers,href:"/admin/players?from=setup"},
  {id:"training",title:"Erstes Training planen",description:"Erstelle einen Termin, damit eure Mannschaft loslegen kann.",required:true,done:hasTraining,href:"/sessions/new?from=setup"},
  {id:"series",title:"Regelmäßige Trainings",description:"Richte eine Trainingsserie ein, damit nicht jede Woche ein neuer Termin nötig ist.",required:false,done:hasSeries,href:"/sessions/new?from=setup"},
  {id:"leaders",title:"Trainingsleiter",description:"Erlaube weiteren Spielern, Trainings durchzuführen.",required:false,done:(leaders.data?.length??0)>0,href:"/admin/members?from=setup"},
  {id:"teams",title:"Faire Teams und Spielstärken",description:"Bestimme, wie strikr eure Teams fair einteilt.",required:false,done:false,href:"/admin/settings?from=setup"},
  {id:"categories",title:"Spielerkategorien",description:"Ordne Spieler in passende Gruppen ein.",required:false,done:false,href:"/admin/settings?from=setup"},
  {id:"rsvp",title:"Zu- und Absagen",description:"Passe die Fristen und Rückmeldungen für eure Termine an.",required:false,done:false,href:"/admin/settings?from=setup"},
  {id:"games",title:"Spiele, Turniere und Spieluhr",description:"Entdecke die Möglichkeiten für Spiele und Ergebnisse.",required:false,done:false,href:"/admin/game-timer?from=setup",pro:true},
  {id:"stats",title:"Statistiken und Auszeichnungen",description:"Lerne Tabellen, MVP und Saisonstatistiken kennen.",required:false,done:false,href:"/admin/settings?from=setup"},
  {id:"cashbox",title:"Mannschaftskasse",description:"Richte Beiträge und Strafen für euer Team ein.",required:false,done:false,href:"/mannschaftskasse?from=setup"},
  {id:"notifications",title:"Kommunikation",description:"Entdecke Ankündigungen und Benachrichtigungen.",required:false,done:false,href:"/admin/announcements?from=setup"},
  {id:"pro",title:"PRO-Funktionen",description:"Sieh dir zusätzliche Möglichkeiten für euren Verein an.",required:false,done:false,href:"/admin/settings?from=setup",pro:true},
 ];
 return <main className="min-h-screen bg-slate-100 px-4 py-6"><div className="mx-auto max-w-3xl"><Link href="/admin" className="mb-4 inline-block text-sm font-semibold text-slate-600">← Admin-Bereich</Link><SetupWizard clubId={clubId} clubName={club.data?.display_name||"Dein Verein"} steps={steps} inlinePanels={{club:<ClubSettingsCard redirectTo="/admin/setup?step=club" removeLogoRedirectTo="/admin/setup?step=club"/>,players:<form action={addWizardPlayer} className="space-y-3"><p className="text-sm font-bold">Spieler direkt hinzufügen</p><input name="first_name" placeholder="Vorname" className="w-full rounded-xl border p-3"/><input name="last_name" placeholder="Nachname" className="w-full rounded-xl border p-3"/><input name="nickname" placeholder="Spitzname (optional)" className="w-full rounded-xl border p-3"/><button type="submit" className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">Spieler speichern</button></form>,season:<SeasonSettingsCard redirectTo="/admin/setup?step=season"/>,teams:<TeamGeneratorSettingsCard useStrength={settings.data?.use_strength??false} useCategories={settings.data?.use_categories??false} redirectTo="/admin/setup?step=teams"/>,categories:<CategorySettingsSection categories={categories.data??[]} useCategories={settings.data?.use_categories??false} isPro={billing.isPro} redirectTo="/admin/setup?step=categories"/>,rsvp:<WizardRsvpForm value={settings.data?.rsvp_deadline_minutes_before??30} reason={settings.data?.require_rsvp_reason_on_absence??false} isPro={billing.isPro}/>}} initial={progress.data} allowTest={ctx.isPowerUser&&club.data?.display_name==="1. FC Strikr 2026"}/></div></main>;
}
