import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_WHEEL_SEGMENTS, parseWheelSegments } from "@/lib/cashbox/wheel-config";
import WheelSettingsEditor from "./WheelSettingsEditor";
import { isCashboxPilotClub } from "@/lib/cashbox/pilot-structure";

export const dynamic = "force-dynamic";

export default async function WheelSettingsPage({searchParams}:{searchParams?:Promise<{penaltyId?:string;ruleKey?:string}>}) {
  const { clubId, isPowerUser, membership } = await requireClub();
  if (!canManageClub({ isPowerUser, role: membership.role })) redirect("/mannschaftskasse");
  const db=createAdminClient();
  const q=await searchParams;
  const pilot=isCashboxPilotClub(clubId);
  let scopeKey="";
  let chosenName="Vereinsstandard";
  const penaltyId=Number(q?.penaltyId);
  if(pilot && q?.penaltyId && Number.isSafeInteger(penaltyId) && penaltyId>0) {
    const {data:p}=await db.from("penalties").select("id,reason").eq("club_id",clubId).eq("id",penaltyId).maybeSingle();
    if(p){scopeKey="penalty:"+p.id;chosenName="Strafe #"+p.id+" · "+(p.reason||"Individuell");}
  } else if(pilot && q?.ruleKey && /^[a-zA-Z0-9_-]{1,100}$/.test(q.ruleKey)) {
    const {data:r}=await db.from("penalty_rules").select("rule_key,label").eq("club_id",clubId).eq("rule_key",q.ruleKey).maybeSingle();
    if(r){scopeKey="rule:"+r.rule_key;chosenName="Katalog: "+r.label;}
  }
  const [{data,error},{data:overrides}, {data:rules}, {data:penalties}]=await Promise.all([
    db.from("penalty_wheel_settings").select("segments").eq("club_id",clubId).maybeSingle(),
    pilot && scopeKey?db.from("pilot_wheel_scoped_configs").select("segments").eq("club_id",clubId).eq("scope_key",scopeKey).maybeSingle():Promise.resolve({data:null}),
    pilot?db.from("penalty_rules").select("rule_key,label").eq("club_id",clubId).order("sort_order").limit(80):Promise.resolve({data:[]}),
    pilot?db.from("penalties").select("id,reason").eq("club_id",clubId).is("resolved_at",null).order("created_at",{ascending:false}).limit(50):Promise.resolve({data:[]}),
  ]);
  if(error)throw new Error("Die Rad-Einstellungen konnten nicht geladen werden.");
  const savedSegments=parseWheelSegments(overrides?.segments);
  const standardSegments=parseWheelSegments(data?.segments) ?? DEFAULT_WHEEL_SEGMENTS;
  const initialSegments=savedSegments ?? standardSegments;
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 pb-28">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/mannschaftskasse" className="text-sm font-semibold text-cyan-700">← Mannschaftskasse</Link>
        <header className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-black uppercase tracking-[0.17em] text-cyan-700">🎡 Vereins-Glücksrad</div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Rad-Felder festlegen</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Dein Verein entscheidet selbst, welche Felder es gibt und wie groß ihre Chancen sind.
            Spieler sehen diese Felder direkt auf dem Schicksalsrad.
          </p>
        </header>
        {pilot?<div className="rounded-2xl border border-teal-200 bg-white p-4">
          <h2 className="font-black text-slate-950">Für welche Strafe gilt das Rad?</h2>
          <p className="mt-1 text-xs text-slate-600">Wähle den Vereinsstandard, einen Katalogeintrag oder eine konkrete Strafe. Deren Rad überschreibt den Standard. Ändert ihr später den Katalog, behalten bereits gedrehte Strafen ihren Ausgang.</p>
          <label className="mt-3 block text-xs font-bold">Individuelle Rad-Konfiguration
            <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" defaultValue={scopeKey}
              // Navigation occurs via a regular GET form below, not JavaScript.
              disabled>
              <option value={scopeKey}>{chosenName}</option>
            </select>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/mannschaftskasse/gluecksrad" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">Vereinsstandard</Link>
            {(rules??[]).map(rule=><Link key={rule.rule_key} href={`/mannschaftskasse/gluecksrad?ruleKey=${encodeURIComponent(rule.rule_key)}`}
               className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">📚 {rule.label}</Link>)}
            {(penalties??[]).map(p=><Link key={p.id} href={`/mannschaftskasse/gluecksrad?penaltyId=${p.id}`}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">⚽ #{p.id} {p.reason||"Strafe"}</Link>)}
          </div>
          <p className="mt-3 text-xs font-black text-teal-900">Aktuell: {chosenName} {savedSegments?"· Eigene Einstellungen":"· noch Vereinsstandard"}</p>
        </div>:null}
        <WheelSettingsEditor initialSegments={initialSegments} scopeKey={scopeKey} pilot={pilot}/>
      </div>
    </main>
  );
}
