import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import ProfileForm from "./ProfileForm";
import ProfilePasswordForm from "./ProfilePasswordForm";
import PushPreferencesForm from "./PushPreferencesForm";

type ProfilePageProps = { searchParams?: Promise<{ account_delete_error?: string; }> };
type ClubRow = { id:string; display_name:string|null; name:string|null };
function getClubLabel(club:ClubRow|null|undefined){return club?.display_name??club?.name??null;}
function getAccountDeleteErrorMessage(error?:string){switch(error){case "confirmation":return 'Bitte gib exakt „KONTO LÖSCHEN“ ein und bestätige die Checkbox.';case "sole_admin":return "Du bist noch alleiniger Admin eines Clubs. Übertrage zuerst die Admin-Rolle oder lösche den Club.";case "delete_failed":return "Dein Konto konnte nicht vollständig gelöscht werden. Bitte versuche es erneut.";default:return "";}}

export default async function ProfilePage({searchParams}:ProfilePageProps){
 const resolvedSearchParams=await searchParams; const ctx=await getAuthContext(); if(!ctx.user) redirect(AUTH_ROUTES.login); const supabase=await createClient(); let activeClubName:string|null=null;
 if(ctx.activeClubId){const {data:club}=await supabase.from("clubs").select("id, display_name, name").eq("id",ctx.activeClubId).maybeSingle<ClubRow>(); activeClubName=getClubLabel(club);}
 const activeMembership=ctx.memberships.find(m=>m.club_id===ctx.activeClubId)??ctx.memberships[0]??null; const role=activeMembership?.role??"member"; const isPowerUser=ctx.isPowerUser; const accountDeleteError=getAccountDeleteErrorMessage(resolvedSearchParams?.account_delete_error); const flags=ctx.activeClubId?await getFeatureFlagsForClub(ctx.activeClubId):null; const badgeFeatureEnabled=flags?.hall_of_fame_badges??false;
 return <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
  {ctx.player ? <Link href={`/players/${ctx.player.id}`} className="group overflow-hidden rounded-[28px] border border-stone-300 bg-[#f4f2e9] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[.22em] text-slate-500">strikr · digital</div><div className="mt-1 text-2xl font-black tracking-tight text-slate-950">Mein Spielerpass</div><p className="mt-1 text-sm text-slate-600">Foto, Geburtstag, Position & Rückennummer</p></div><div className="rounded-xl border border-stone-300 bg-white/60 px-3 py-2 text-right text-[10px] font-mono text-slate-500">PASS-NR.<br/><b className="text-sm text-slate-900">STR-{String(ctx.player.id).padStart(5,"0")}</b></div></div><div className="mt-4 text-sm font-black text-slate-900">Spielerpass öffnen →</div></Link> : null}
  {flags?.penalties ? <Link href="/mannschaftskasse" className="rounded-[28px] bg-slate-950 p-5 text-white shadow-sm"><div className="text-[10px] font-black uppercase tracking-[.2em] text-white/50">Teamleben</div><div className="mt-1 text-xl font-black">💰 Mannschaftskasse</div><p className="mt-1 text-sm text-white/70">Offene Posten sehen oder direkt einen neuen melden.</p><div className="mt-4 text-sm font-black">Kasse öffnen →</div></Link> : null}
  <ProfileForm player={ctx.player} email={ctx.user.email??""} activeClubName={activeClubName} activeClubId={ctx.activeClubId}/>
  {badgeFeatureEnabled?<Link href="/badges" className="group rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm"><div className="text-xs font-black uppercase tracking-[0.18em] text-white/55">Badges</div><div className="mt-2 text-xl font-extrabold">Hall of Fame öffnen</div><p className="mt-2 text-sm text-white/70">Deine erreichten und noch offenen Badges ansehen.</p></Link>:null}
  <PushPreferencesForm/>
  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Konto</h2><div className="mt-3 text-sm text-slate-700">{activeClubName??"Kein aktiver Club"} · {role} · {ctx.user.email??"—"}{isPowerUser?" · Super User":""}</div></section>
  <ProfilePasswordForm email={ctx.user.email??""}/>
  <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm"><div className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">Gefahrenbereich</div><h2 className="mt-3 text-xl font-extrabold text-slate-950">Konto dauerhaft löschen</h2><p className="mt-2 text-sm leading-6 text-slate-700">Dein Login und deine persönlichen Daten werden gelöscht. Bereits abgeschlossene Teamstatistiken bleiben anonymisiert erhalten.</p>{accountDeleteError?<div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{accountDeleteError}</div>:null}<form method="post" action="/api/account/delete" className="mt-5 space-y-4"><label className="block text-sm font-semibold">Zur Bestätigung „KONTO LÖSCHEN“ eingeben<input name="confirmation" className="mt-2 w-full rounded-xl border border-rose-200 px-3.5 py-2.5" placeholder="KONTO LÖSCHEN"/></label><label className="flex gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-900"><input type="checkbox" name="acknowledgement" value="1"/> Mir ist bewusst, dass dieser Vorgang nicht rückgängig gemacht werden kann.</label><button className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white">Konto dauerhaft löschen</button></form></section>
 </main>;
}
