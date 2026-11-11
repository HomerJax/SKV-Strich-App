import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import SetupWizard from "@/components/admin/SetupWizard";

export default async function AdminSetupPage() {
 const ctx=await getAuthContext();
 if(!ctx.user) redirect("/login");
 if(!ctx.activeClubId) redirect("/select-club");
 const membership=ctx.memberships.find(m=>m.club_id===ctx.activeClubId);
 if(!ctx.isPowerUser && membership?.role!=="admin") redirect("/home");
 const db=await createClient(),clubId=ctx.activeClubId;
 const [club,seasons,players,sessions,leaders,progress]=await Promise.all([
  db.from("clubs").select("display_name").eq("id",clubId).maybeSingle(),
  db.from("seasons").select("id").eq("club_id",clubId).limit(1),
  db.from("players").select("id").eq("club_id",clubId).limit(2),
  db.from("sessions").select("id,series_id").eq("club_id",clubId).limit(100),
  db.from("players").select("id").eq("club_id",clubId).eq("can_lead_training",true).limit(1),
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
  {id:"games",title:"Spiele, Turniere und Spieluhr",description:"Entdecke die Möglichkeiten für Spiele und Ergebnisse.",required:false,done:false,href:"/admin/game-timer",pro:true},
  {id:"stats",title:"Statistiken und Auszeichnungen",description:"Lerne Tabellen, MVP und Saisonstatistiken kennen.",required:false,done:false,href:"/admin/settings?from=setup"},
  {id:"cashbox",title:"Mannschaftskasse",description:"Richte Beiträge und Strafen für euer Team ein.",required:false,done:false,href:"/mannschaftskasse"},
  {id:"notifications",title:"Kommunikation",description:"Entdecke Ankündigungen und Benachrichtigungen.",required:false,done:false,href:"/admin/announcements"},
  {id:"pro",title:"PRO-Funktionen",description:"Sieh dir zusätzliche Möglichkeiten für euren Verein an.",required:false,done:false,href:"/admin/settings?from=setup",pro:true},
 ];
 return <main className="min-h-screen bg-slate-100 px-4 py-6"><div className="mx-auto max-w-3xl"><Link href="/admin" className="mb-4 inline-block text-sm font-semibold text-slate-600">← Admin-Bereich</Link><SetupWizard clubId={clubId} clubName={club.data?.display_name||"Dein Verein"} steps={steps} initial={progress.data} allowTest={ctx.isPowerUser&&club.data?.display_name==="1. FC Strikr 2026"}/></div></main>;
}
