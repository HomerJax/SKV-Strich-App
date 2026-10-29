import Link from "next/link";
import { createHash } from "node:crypto";
import { getAuthContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerI18n } from "@/lib/i18n/server";
import { acceptNewTeamInviteAction } from "./actions";

type Props = {
  params: Promise<{token:string}>;
  searchParams?: Promise<{error?:string}>;
};
const sports = [
  ["football","Fußball","Football"],["handball","Handball","Handball"],
  ["basketball","Basketball","Basketball"],["volleyball","Volleyball","Volleyball"],
  ["ice_hockey","Eishockey","Ice hockey"],["tennis","Tennis","Tennis"],
  ["padel","Padel","Padel"],["other","Andere Sportart","Other"],
] as const;

export default async function NewParentTeamInvitePage({params,searchParams}:Props){
  const {token}=await params;
  const q=await searchParams;
  const {locale}=await getServerI18n();
  const en=locale==="en";
  const validToken=/^[a-f0-9]{64}$/.test(token);
  const db=createAdminClient();
  const hash=validToken?createHash("sha256").update(token).digest("hex"):"";
  const {data:invite}=validToken?await db.from("pilot_parent_new_team_invites")
    .select("owner_club_id,source_club_id,name_hint,status,expires_at")
    .eq("token_hash",hash).maybeSingle():{data:null};
  const available=Boolean(invite?.status==="pending" && new Date(invite.expires_at)>new Date());
  const auth=await getAuthContext();
  const [{data:org},{data:source},{data:seed}]=await Promise.all([
    available?db.from("pilot_parent_clubs").select("name").eq("owner_club_id",invite!.owner_club_id).maybeSingle():Promise.resolve({data:null}),
    available?db.from("clubs").select("sport_type,primary_color").eq("id",invite!.source_club_id).maybeSingle():Promise.resolve({data:null}),
    available&&auth.user?db.from("players").select("first_name,last_name").eq("user_id",auth.user.id)
      .eq("is_guest",false).limit(1).maybeSingle():Promise.resolve({data:null}),
  ]);
  const url=`/organization/new-team/${token}`;
  const input="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-950";
  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-10">
      <section className="mx-auto max-w-xl space-y-4">
        <Link href="/" className="text-xs font-black text-slate-600">← strikr</Link>
        <header className="rounded-3xl bg-slate-950 p-6 text-white">
          <div className="text-xs font-black uppercase tracking-[.15em] text-cyan-300">
            {en?"Team invitation":"Mannschaftseinladung"}
          </div>
          <h1 className="mt-3 text-3xl font-black">{org?.name || "strikr"}</h1>
          <p className="mt-2 text-sm leading-6 text-white/70">{en
            ? "Create your own team within this parent club. You will be the team admin."
            : "Gründe deine eigene Mannschaft unter diesem Dachverein. Du wirst automatisch Teamadmin."}</p>
        </header>
        {!available || !org || !source ? (
          <div className="rounded-2xl bg-white p-6">
            <h2 className="text-lg font-black">{en?"Invitation unavailable":"Einladung nicht verfügbar"}</h2>
            <p className="mt-2 text-sm text-slate-600">{en
              ? "This invitation has expired, was revoked or has already been used. Ask the parent club admin for a new link."
              : "Diese Einladung ist abgelaufen, widerrufen oder bereits verwendet. Bitte den Vereinsadmin um einen neuen Link."}</p>
          </div>
        ) : !auth.user ? (
          <div className="space-y-4 rounded-2xl bg-white p-6">
            <h2 className="text-xl font-black">{invite?.name_hint || (en?"New team":"Neue Mannschaft")}</h2>
            <p className="text-sm leading-6 text-slate-600">{en
              ? "Sign in or create a free strikr account first. Then you will return here and choose your team details."
              : "Melde dich zuerst an oder erstelle kostenlos einen strikr-Account. Danach kommst du direkt hierher zurück."}</p>
            <div className="flex flex-wrap gap-3">
              <Link href={`/login?next=${encodeURIComponent(url)}`} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
                {en?"Sign in":"Anmelden"}
              </Link>
              <Link href={`/signup?next=${encodeURIComponent(url)}`} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-black text-slate-900">
                {en?"Register":"Neu registrieren"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">{en?"Create your team":"Deine Mannschaft gründen"}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{en
              ? "The parent club's brand color, logo, categories, game timer and attendance defaults will be copied. Everything can be adapted afterward. The team starts with no transactions, player history or inherited paid subscription."
              : "Vereinsfarbe, Logo, Kategorien, Spieluhr- und Anwesenheitseinstellungen werden als Vorlage übernommen und können danach geändert werden. Die Mannschaft startet ohne fremde Spieler, Buchungen, Ergebnisse oder übernommenes Pro-Abo."}</p>
            {q?.error ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800">{en
              ? "Unable to create team. Please check the information or request a new invitation."
              : "Mannschaft konnte nicht erstellt werden. Prüfe die Angaben oder bitte um einen neuen Einladungslink."}</p> : null}
            <form action={acceptNewTeamInviteAction} className="mt-5 space-y-4">
              <input type="hidden" name="token" value={token}/>
              <label className="block text-sm font-bold text-slate-800">
                {en?"Team name":"Mannschaftsname"}
                <input required minLength={2} maxLength={80} className={input} name="team_name" defaultValue={invite?.name_hint||""}/>
              </label>
              <label className="block text-sm font-bold text-slate-800">
                {en?"Sport":"Sportart"}
                <select className={input} name="sport_type" defaultValue={source?.sport_type||"football"}>
                  {sports.map(([value,de,enLabel])=><option key={value} value={value}>{en?enLabel:de}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-bold text-slate-800">
                  {en?"First name":"Vorname"}
                  <input className={input} required maxLength={80} name="first_name" defaultValue={seed?.first_name||""}/>
                </label>
                <label className="block text-sm font-bold text-slate-800">
                  {en?"Last name":"Nachname"}
                  <input className={input} maxLength={80} name="last_name" defaultValue={seed?.last_name||""}/>
                </label>
              </div>
              <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-700">
                <input type="checkbox" name="agree" value="yes" required className="mt-1"/>
                {en?"I accept the invitation and want to create my own team as its admin."
                  :"Ich nehme die Einladung an und möchte als Teamadmin meine eigene Mannschaft erstellen."}
              </label>
              <button className="w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white">
                {en?"Create team and join parent club":"Mannschaft erstellen und Dachverein beitreten"}
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
