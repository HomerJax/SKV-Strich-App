import Link from "next/link";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import InviteActions from "@/app/admin/members/InviteActions";
import { buildAbsoluteInviteUrl } from "@/lib/invites/url";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import SetupWizard from "@/components/admin/SetupWizard";
import ProOnboardingFinish from "@/components/admin/ProOnboardingFinish";
import { isProTrialEnabled } from "@/lib/billing/pro-trial";
import ClubSetupClubStep from "@/components/club-setup/ClubSetupClubStep";
import SeasonSettingsCard from "@/components/admin/settings/SeasonSettingsCard";
import TeamGeneratorSettingsCard from "@/components/admin/settings/TeamGeneratorSettingsCard";
import { CategorySettingsSection } from "@/components/admin/settings/CategorySettingsSection";
import WizardRsvpForm from "@/components/admin/WizardRsvpForm";
import TrainingSeriesOnboardingForm from "@/components/admin/TrainingSeriesOnboardingForm";
import { getQaSeasonRange, selectOnboardingSeason, getSecondTrainingStart, getWeeklyTrainingDates } from "@/lib/onboarding/training-template";
import { getClubBillingAccess } from "@/lib/billing/club-billing";

export default async function AdminSetupPage({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}) {
 const params=await searchParams; const qaMode=params?.qa==="1"; const inviteToken=typeof params?.invite_token==="string"?params.invite_token:"";
 const ctx=await getAuthContext();
 if(!ctx.user) redirect("/login");
 if(qaMode&&!ctx.isPowerUser)redirect("/admin");
 if(!ctx.activeClubId) redirect("/select-club");
 const membership=ctx.memberships.find(m=>m.club_id===ctx.activeClubId);
 if(!ctx.isPowerUser && membership?.role!=="admin") redirect("/home");
 const db=await createClient(),clubId=ctx.activeClubId;

 const [club,seasons,players,sessions,leaders,leaderCandidates,settings,categories,billing,progress]=await Promise.all([
  db.from("clubs").select("display_name,primary_color,sport_type,logo_path").eq("id",clubId).maybeSingle(),
  db.from("seasons").select("id,name,start_date,end_date").eq("club_id",clubId).order("start_date",{ascending:false}),
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
  const weekdayRaw=String(formData.get("weekday")??"");
  const secondWeekdayRaw=String(formData.get("weekday_two")??"");
  const secondTime=String(formData.get("start_time_two")??"");
  const weekday=Number(weekdayRaw);
  const secondWeekday=secondWeekdayRaw===""?null:Number(secondWeekdayRaw);
  const dateFormat=/^\d{4}-\d{2}-\d{2}$/;
  const timeFormat=/^([01]\d|2[0-3]):[0-5]\d$/;
  if(!dateFormat.test(start)||!dateFormat.test(end)||end<start
    ||!timeFormat.test(time)||! /^[0-6]$/.test(weekdayRaw)
    ||new Date(start+"T12:00:00Z").getUTCDay()!==weekday
    ||(secondWeekday!==null && (! /^[0-6]$/.test(secondWeekdayRaw)||secondWeekday===weekday||!timeFormat.test(secondTime)))
  )redirect("/admin/setup?step=training&error=date");
  const db=await createClient();
  const {data:season}=await db.from("seasons").select("id,start_date,end_date")
    .eq("club_id",auth.activeClubId).lte("start_date",start)
    .or(`end_date.is.null,end_date.gte.${end}`).limit(1).maybeSingle();
  if(!season||!season.start_date)redirect("/admin/setup?step=training&error=season");
  if((season.end_date&&end>season.end_date)||start<season.start_date)
    redirect("/admin/setup?step=training&error=season_range");
  const secondStart=secondWeekday!==null
    ?getSecondTrainingStart(season.start_date,start,weekday,secondWeekday):null;
  if(secondWeekday!==null&&(!secondStart||secondStart>end))
    redirect("/admin/setup?step=training&error=range");
  const firstDates=getWeeklyTrainingDates(start,end,weekday);
  const secondDates=secondWeekday!==null&&secondStart
    ?getWeeklyTrainingDates(secondStart,end,secondWeekday):[];
  if(!firstDates.length||firstDates.length>52
    ||(secondWeekday!==null&&(!secondDates.length||secondDates.length>52)))
    redirect("/admin/setup?step=training&error=range");
  const allDates=[...new Set([...firstDates,...secondDates])];
  const {data:existing,error:lookupError}=await db.from("sessions").select("date")
    .eq("club_id",auth.activeClubId).in("date",allDates)
    .or("type.eq.training,type.is.null");
  if(lookupError)redirect("/admin/setup?step=training&error=save");
  const seen=new Set((existing??[]).map(x=>x.date));
  const firstNew=firstDates.filter(date=>!seen.has(date));
  const secondNew=secondDates.filter(date=>!seen.has(date));
  if(!firstNew.length&&!secondNew.length)
    redirect("/admin/setup?step=training&error=existing");
  const firstSeriesId=randomUUID();
  const secondSeriesId=secondNew.length?randomUUID():null;
  const newSessions=[
    ...firstNew.map((date,i)=>({club_id:auth.activeClubId,date,start_time:time,season_id:season.id,type:"training",series_id:firstSeriesId,series_index:i+1})),
    ...secondNew.map((date,i)=>({club_id:auth.activeClubId,date,start_time:secondTime,season_id:season.id,type:"training",series_id:secondSeriesId!,series_index:i+1}))
  ];
  // Insert both optional weekday series in one request, not sequential saves.
  const {error}=await db.from("sessions").insert(newSessions);
  redirect(error?"/admin/setup?step=training&error=save":"/admin/setup?step=rsvp&saved=1");
 }
 const seasonForTraining=qaMode?{name:"strikr Standardsaison",...getQaSeasonRange()}:selectOnboardingSeason(seasons.data??[]);
 const hasSeason=(seasons.data?.length??0)>0;
 const hasPlayers=(players.data?.length??0)>=2;
 const hasTraining=(sessions.data?.length??0)>0;
 const hasSeries=(sessions.data??[]).some(s=>s.series_id!==null);
 const steps=[
  {id:"club",title:"Vereinsgrunddaten",description:"Der Teamname wurde bereits bei der Gründung festgelegt. Hier ergänzt ihr Logo, Sportart und Vereinsfarbe; den Namen könnt ihr bei Bedarf ändern.",required:true,done:!!club.data?.display_name,href:"/admin/settings?from=setup"},
  {id:"season",title:"Saison festlegen",description:"Die Saison bündelt alle Trainings, Ergebnisse und Statistiken. Eine einjährige strikr-Standardsaison wurde bei Vereinsgründung bereits angelegt; mit PRO lassen sich Name und Zeitraum anpassen. Nach PRO-Ende gilt wieder der Free-Standard (automatische Rücksetzung in Vorbereitung).",required:true,done:hasSeason,href:"/admin/seasons?from=setup"},
  {id:"training",title:"Trainingsbetrieb einrichten",description:"Lege erst nach der Saison die regelmäßigen Trainingstage und Uhrzeiten fest. Trainings müssen der Saison zugeordnet sein.",required:true,done:hasSeries||hasTraining,href:"/sessions/new?from=setup"},
  {id:"rsvp",title:"Zu- und Absagen",description:"Rückmeldefrist und Absageregeln festlegen. Free hat eine feste Frist von 30 Minuten; individuelle Fristen sind PRO. Nach PRO-Ende gelten wieder die Free-Regeln (automatische Rücksetzung in Vorbereitung).",required:false,done:false,href:"/admin/settings?from=setup"},
  {id:"teams",title:"Faire Teams und Spielstärken",description:"strikr verteilt Spieler möglichst gleichmäßig – auf Wunsch nach Spielstärke und Position. Hier den Teamgenerator erklären und einstellen.",required:false,done:false,href:"/admin/settings?from=setup"},
  {id:"categories",title:"Spielerkategorien",description:"Fasse Spieler in Kategorien zusammen, etwa „Jung“ und „Alt“. Markiere eine Kategorie als stärker: strikr gewichtet sie beim Teamausgleich zusätzlich zur individuellen Spielstärke. Positionen stellst du separat ein. Dieser Schritt ist optional.",required:false,done:false,href:"/admin/settings?from=setup"},
  {id:"pro",title:"PRO-Testphase und Abschluss",description:"Euer Tarif im Überblick – anschließend Mitspieler einladen und direkt loslegen. PRO ist freiwillig, Free bleibt kostenlos.",required:false,done:false,href:"/pro"},
 ];
 return <main className="min-h-screen bg-slate-100 px-4 py-6"><div className="mx-auto max-w-3xl"><Link href={qaMode?"/power-user/onboarding-simulator":"/admin"} className="mb-4 inline-block text-sm font-semibold text-slate-600">{qaMode?"← Registrierungssimulator":"← Admin-Bereich"}</Link>{qaMode?<p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"><strong>SIMULATION · Derselbe Einrichtungswizard wie im echten Verein</strong> · Speichern wird hier abgefangen. Die Daten des aktuell ausgewählten Vereins dienen nur zum Anzeigen der vorhandenen Einstellungen und werden nicht verändert.</p>:null}<SetupWizard clubId={clubId} clubName={qaMode?"Testverein · Simulation":(club.data?.display_name||"Dein Verein")} steps={steps} preview={qaMode} inlinePanels={{club:<ClubSetupClubStep initialDisplayName={qaMode?"Testverein":(club.data?.display_name??"")} initialPrimaryColor={qaMode?"black":(club.data?.primary_color??"black")} initialSportType={qaMode?"football":(club.data?.sport_type??"football")} initialLogoUrl={qaMode?null:(club.data?.logo_path?db.storage.from("club-logos").getPublicUrl(club.data.logo_path).data.publicUrl:null)} useNicknames={false} redirectTo="/admin/setup?step=club" submitLabel="Vereinsdaten speichern" variant="onboarding" qaInWizard={qaMode}/>,players:<div className="space-y-3"><p className="text-sm font-bold">Mitspieler per Einladung aufnehmen</p><p className="text-sm text-slate-600">Deine Mitspieler registrieren sich selbst über einen Einladungslink. Du musst keine Spieler manuell anlegen.</p>{inviteToken?<InviteActions inviteUrl={buildAbsoluteInviteUrl(process.env.NEXT_PUBLIC_APP_URL||"https://strikr.team",inviteToken)}/>:<form method="post" action="/admin/members/create"><input type="hidden" name="role" value="member"/><input type="hidden" name="redirect_to" value="/admin/setup?step=players"/><button type="submit" className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">Einladungslink erstellen</button></form>}</div>,season:<SeasonSettingsCard redirectTo="/admin/setup?step=season" variant="onboarding" qaPreview={qaMode}/>,teams:<TeamGeneratorSettingsCard useStrength={settings.data?.use_strength??false} useCategories={settings.data?.use_categories??false} redirectTo="/admin/setup?step=teams" variant="onboarding"/>,categories:<CategorySettingsSection categories={qaMode?[]:(categories.data??[])} useCategories={qaMode?true:(settings.data?.use_categories??false)} isPro={qaMode?true:billing.isPro} redirectTo="/admin/setup?step=categories" variant="onboarding"/>,training:seasonForTraining?<TrainingSeriesOnboardingForm seasonName={seasonForTraining.name} seasonStart={seasonForTraining.start_date} seasonEnd={seasonForTraining.end_date} createSeries={addWizardSeries}/>:<p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Bitte zuerst eine Saison festlegen, damit der Trainingszeitraum korrekt vorbelegt werden kann.</p>,series:<form action={addWizardSeries} className="space-y-3"><p className="text-sm font-bold">Wiederkehrendes Training planen</p><label className="block text-xs font-semibold">Von<input required name="start_date" type="date" className="mt-1 w-full rounded-xl border p-3"/></label><label className="block text-xs font-semibold">Bis (maximal 52 Wochen, innerhalb einer Saison)<input required name="end_date" type="date" className="mt-1 w-full rounded-xl border p-3"/></label><label className="block text-xs font-semibold">Wochentag<select name="weekday" className="mt-1 w-full rounded-xl border p-3"><option value="1">Montag</option><option value="2">Dienstag</option><option value="3">Mittwoch</option><option value="4">Donnerstag</option><option value="5">Freitag</option><option value="6">Samstag</option><option value="0">Sonntag</option></select></label><label className="block text-xs font-semibold">Beginn<input required name="start_time" type="time" defaultValue="19:00" className="mt-1 w-full rounded-xl border p-3"/></label><button type="submit" className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">Trainingsserie anlegen</button></form>,leaders:<div className="space-y-3"><p className="text-sm font-bold">Trainingsleiter festlegen</p>{(leaderCandidates.data??[]).map(player=><form key={player.id} action={updateWizardLeader} className="flex items-center justify-between gap-3 rounded-xl border p-3"><span className="text-sm">{player.name} {player.can_lead_training?"· Leiter":""}</span><input type="hidden" name="player_id" value={player.id}/><input type="hidden" name="enabled" value={player.can_lead_training?"0":"1"}/><button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">{player.can_lead_training?"Entfernen":"Als Leiter einsetzen"}</button></form>)}</div>,rsvp:<WizardRsvpForm value={settings.data?.rsvp_deadline_minutes_before??30} reason={settings.data?.require_rsvp_reason_on_absence??false} isPro={billing.isPro}/>,pro:<ProOnboardingFinish billing={billing} preview={qaMode} trialAvailableForNewClubs={isProTrialEnabled()}/>}} initial={qaMode?null:progress.data} allowTest={!qaMode&&ctx.isPowerUser&&club.data?.display_name==="1. FC Strikr 2026"}/></div></main>;
}
