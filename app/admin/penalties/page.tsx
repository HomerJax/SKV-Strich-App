import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import { addPenaltyAction, deletePenaltyAction, reopenPenaltyAction, resolvePenaltyAction, savePenaltyRuleAction } from "./actions";
import { saveBeerkasseAction } from "./beerkasse-actions";

type Props = { searchParams?: Promise<{ saved?: string; error?: string; beerkasse_saved?: string; beerkasse_error?: string }> };
type Player = { id: number; name: string | null; first_name: string | null; last_name: string | null; nickname: string | null };
type Entry = { id: number; player_id: number; reason: string | null; type: "beer" | "money" | "custom"; value: string | null; created_at: string; due_date: string | null; resolved_at: string | null; escalation_after_days: number | null; escalation_value: string | null };
type Rule = { rule_key: string; label: string; reason: string; type: "beer" | "money" | "custom"; value: string; escalation_after_days: number | null; escalation_value: string | null; enabled: boolean };

function pn(p: Player) { return p.nickname?.trim() || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.name || `Spieler ${p.id}`; }
function esc(e: Entry) { return !e.resolved_at && !!e.escalation_value && !!e.due_date && e.due_date <= new Date().toISOString().slice(0, 10); }

export default async function Page({ searchParams }: Props) {
  const q = await searchParams;
  const { clubId, membership, isPowerUser } = await requireClub();
  if (!canManageClub({ isPowerUser, role: membership.role })) redirect("/admin");
  const flags = await getFeatureFlagsForClub(clubId);
  if (!(flags.penalties ?? false)) redirect("/admin");
  const s = await createClient();

  const [{ data: playersData }, { data: entriesData }, { data: settings }, { data: rulesData }] = await Promise.all([
    s.from("players").select("id,name,first_name,last_name,nickname").eq("club_id", clubId).eq("is_guest", false).eq("is_active", true).order("first_name"),
    s.from("penalties").select("id,player_id,reason,type,value,created_at,due_date,resolved_at,escalation_after_days,escalation_value").eq("club_id", clubId).order("created_at", { ascending: false }),
    s.from("club_settings").select("beerkasse_enabled,beerkasse_paypal_url,beerkasse_home_enabled").eq("club_id", clubId).maybeSingle(),
    s.from("penalty_rules").select("rule_key,label,reason,type,value,escalation_after_days,escalation_value,enabled").eq("club_id", clubId).order("sort_order"),
  ]);

  const players = (playersData ?? []) as Player[];
  const entries = (entriesData ?? []) as Entry[];
  const rules = (rulesData ?? []) as Rule[];
  const names = new Map(players.map((p) => [p.id, pn(p)]));
  const open = entries.filter((e) => !e.resolved_at);
  const done = entries.filter((e) => e.resolved_at);

  return <main className="min-h-screen bg-neutral-100"><section className="mx-auto max-w-4xl space-y-4 px-4 py-5 pb-24">
    <Link href="/admin" className="text-sm font-semibold text-slate-600">← Adminbereich</Link>
    <div className="rounded-[26px] bg-slate-950 p-5 text-white"><div className="text-xs font-bold uppercase tracking-[.2em] text-white/50">Teamleben</div><h1 className="mt-1 text-2xl font-black">💰 Mannschaftskasse</h1><p className="mt-2 text-sm text-white/70">Kleine Beträge, Kisten und die wichtigen Regeln des Mannschaftslebens.</p></div>

    {q?.saved ? <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">✓ Gespeichert</p> : null}
    {q?.error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{q.error}</p> : null}

    <div className="rounded-[24px] border border-amber-200 bg-amber-50/70 p-5"><div className="flex items-center gap-2"><span className="text-2xl">🍺</span><div><h2 className="font-black">Bierkasse · Bier zahlen</h2><p className="text-xs text-slate-600">PayPal-Link hinterlegen und optional auf Home anzeigen.</p></div></div>{q?.beerkasse_saved ? <p className="mt-3 text-xs font-bold text-emerald-700">✓ Gespeichert</p> : null}{q?.beerkasse_error ? <p className="mt-3 text-xs font-bold text-red-700">Bitte gültigen https-Link eintragen.</p> : null}<form action={saveBeerkasseAction} className="mt-4 space-y-3"><input name="paypal_url" defaultValue={settings?.beerkasse_paypal_url ?? ""} placeholder="https://paypal.me/..." className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm" /><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="enabled" defaultChecked={settings?.beerkasse_enabled === true} /> Bierkasse für Spieler anzeigen</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="home_enabled" defaultChecked={settings?.beerkasse_home_enabled === true} /> „Bier zahlen“ zusätzlich auf Home anzeigen</label><button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Speichern</button></form></div>

    <div className="rounded-[24px] border bg-white p-5"><h2 className="text-lg font-black">Regeln</h2><p className="mt-1 text-xs text-slate-500">Diese Regeln sehen Spieler beim Melden. Geburtstage werden täglich automatisch aus dem Spielerpass erzeugt.</p><div className="mt-4 space-y-3">{rules.map((r) => <form key={r.rule_key} action={savePenaltyRuleAction} className="rounded-2xl border bg-slate-50 p-3"><input type="hidden" name="rule_key" value={r.rule_key} /><div className="grid gap-2 sm:grid-cols-2"><input name="label" defaultValue={r.label} className="rounded-xl border bg-white px-3 py-2 text-sm font-bold" /><input name="reason" defaultValue={r.reason} className="rounded-xl border bg-white px-3 py-2 text-sm" /><select name="type" defaultValue={r.type} className="rounded-xl border bg-white px-3 py-2 text-sm"><option value="beer">Sachposten</option><option value="money">Geld</option><option value="custom">Sonstiges</option></select><input name="value" defaultValue={r.value} className="rounded-xl border bg-white px-3 py-2 text-sm" /></div><div className="mt-2 grid gap-2 sm:grid-cols-2"><input name="escalation_after_days" type="number" min="1" defaultValue={r.escalation_after_days ?? ""} placeholder="Eskalation nach Tagen" className="rounded-xl border bg-white px-3 py-2 text-sm" /><input name="escalation_value" defaultValue={r.escalation_value ?? ""} placeholder="z. B. + 1 Sechserträger" className="rounded-xl border bg-white px-3 py-2 text-sm" /></div><div className="mt-3 flex items-center justify-between"><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" name="enabled" defaultChecked={r.enabled} /> Aktiv</label><button className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">Regel speichern</button></div></form>)}</div></div>

    <div className="rounded-[24px] border bg-white p-5"><h2 className="text-lg font-black">Neuer Posten</h2><form action={addPenaltyAction} className="mt-4 space-y-3"><select name="player_id" required className="w-full rounded-xl border px-3 py-2.5 text-sm"><option value="">Spieler wählen</option>{players.map((p) => <option key={p.id} value={p.id}>{pn(p)}</option>)}</select><select name="preset" defaultValue="" className="w-full rounded-xl border px-3 py-2.5 text-sm"><option value="">Eigener Posten</option>{rules.filter((r) => r.enabled).map((r) => <option key={r.rule_key} value={r.rule_key}>{r.label} · {r.value}</option>)}</select><div className="grid gap-2 sm:grid-cols-3"><input name="reason" placeholder="Eigener Grund" className="rounded-xl border px-3 py-2.5 text-sm" /><select name="type" className="rounded-xl border px-3 py-2.5 text-sm"><option value="beer">Sachposten</option><option value="money">Geld</option><option value="custom">Sonstiges</option></select><input name="value" placeholder="z. B. Kuchen / 2 €" className="rounded-xl border px-3 py-2.5 text-sm" /></div><input name="notes" placeholder="Notiz (optional)" className="w-full rounded-xl border px-3 py-2.5 text-sm" /><button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Posten eintragen</button></form></div>

    <div className="rounded-[24px] border bg-white p-5"><h2 className="text-lg font-black">Offene Posten · {open.length}</h2><div className="mt-3 space-y-2">{open.length ? open.map((e) => <div key={e.id} className={`rounded-xl border p-3 ${esc(e) ? "border-amber-300 bg-amber-50" : ""}`}><div className="flex justify-between gap-3"><div><b>{names.get(e.player_id) ?? e.player_id}</b><div className="text-sm text-slate-600">{e.reason} · <b>{e.value}</b></div>{esc(e) ? <div className="text-xs font-black text-amber-800">Überfällig: {e.escalation_value}</div> : e.due_date && e.escalation_value ? <div className="text-xs text-slate-500">Bis {new Date(`${e.due_date}T12:00:00`).toLocaleDateString("de-DE")} · danach {e.escalation_value}</div> : null}</div><div className="flex gap-1"><form action={resolvePenaltyAction}><input type="hidden" name="penalty_id" value={e.id} /><button className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold">✓</button></form><form action={deletePenaltyAction}><input type="hidden" name="penalty_id" value={e.id} /><button className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold">Löschen</button></form></div></div></div>) : <p className="text-sm text-slate-500">Alles beglichen. 😄</p>}</div></div>

    {done.length ? <details className="rounded-[24px] border bg-white p-5"><summary className="cursor-pointer font-black">Beglichen ({done.length})</summary>{done.map((e) => <div key={e.id} className="mt-2 flex justify-between rounded-xl bg-slate-50 p-3 text-sm"><span><b>{names.get(e.player_id)}</b> · {e.reason}</span><form action={reopenPenaltyAction}><input type="hidden" name="penalty_id" value={e.id} /><button className="text-xs font-bold">Öffnen</button></form></div>)}</details> : null}
  </section></main>;
}
