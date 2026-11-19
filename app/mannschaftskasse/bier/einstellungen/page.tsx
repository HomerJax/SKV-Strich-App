import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import BeerWorkflowHelp from "@/components/cashbox/BeerWorkflowHelp";
import { saveBeerSettingsAction } from "./actions";

export default async function BeerSettingsPage({ searchParams }: { searchParams?: Promise<{ error?: string; saved?: string }> }) {
  const ctx = await requireClub();
  if (!canManageClub({ isPowerUser: ctx.isPowerUser, role: ctx.membership.role })) redirect("/home");
  const q = await searchParams;
  const { data: s } = await createAdminClient().from("club_settings")
    .select("beerkasse_enabled,beerkasse_home_enabled,beerkasse_price_cents,beerkasse_paypal_url,beerkasse_paypal_me_url,beerkasse_sumup_url,beerkasse_cash_enabled")
    .eq("club_id", ctx.clubId).maybeSingle();
  const field = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900";
  return <main className="min-h-screen bg-slate-50 px-4 py-6 pb-24 text-slate-950">
    <div className="mx-auto max-w-xl space-y-5">
      <Link href="/home" className="text-sm font-semibold text-slate-600">← Home</Link>
      <div className="rounded-3xl bg-slate-950 p-6 text-white">
        <div className="text-4xl">🍺</div>
        <h1 className="mt-3 text-2xl font-black">Bierkasse einrichten</h1>
        <p className="mt-2 text-sm text-white/70">Eigenständig nutzbar – ganz ohne Mannschaftskasse, Strafen oder Beiträge.</p>
      </div>
      {q?.saved && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">✓ Bierkasse gespeichert.</p>}
      {q?.error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800">Bitte Angaben prüfen: {q.error === "price" ? "Preis" : q.error === "link" ? "Zahlungslink" : q.error === "payment" ? "Mindestens eine Zahlungsart" : "Speichern fehlgeschlagen"}.</p>}
      <form action={saveBeerSettingsAction} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="flex items-center gap-3 font-bold"><input type="checkbox" name="enabled" defaultChecked={s?.beerkasse_enabled === true} className="h-5 w-5" /> Bierkasse aktivieren</label>
        <label className="block text-sm font-bold">Preis pro Bier (€)<input name="price" inputMode="decimal" required defaultValue={((s?.beerkasse_price_cents ?? 200)/100).toFixed(2).replace(".",",")} className={field} /></label>
        <fieldset className="space-y-3"><legend className="text-sm font-black">Zahlungsarten</legend>
          <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" name="cash" defaultChecked={s?.beerkasse_cash_enabled !== false} className="h-4 w-4" /> Barzahlung ermöglichen</label>
          <label className="block text-sm font-bold">PayPal Pool (optional)<input name="paypal" type="url" defaultValue={s?.beerkasse_paypal_url ?? ""} placeholder="https://www.paypal.com/pool/..." className={field} /></label>
          <label className="block text-sm font-bold">PayPal.Me (optional)<input name="paypal_me" type="url" defaultValue={s?.beerkasse_paypal_me_url ?? ""} placeholder="https://paypal.me/..." className={field} /></label>
          <label className="block text-sm font-bold">SumUp (optional)<input name="sumup" type="url" defaultValue={s?.beerkasse_sumup_url ?? ""} placeholder="https://pay.sumup.com/..." className={field} /></label>
        </fieldset>
        <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" name="home" defaultChecked={s?.beerkasse_home_enabled === true} className="h-4 w-4" /> Bierkasse auf Home anzeigen</label>
        <BeerWorkflowHelp audience="setup" />
        <button type="submit" className="w-full rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Bierkasse speichern</button>
      </form>
      <Link href="/mannschaftskasse/bier" className="block text-center text-sm font-bold text-amber-800">Bierbuchungen verwalten →</Link>
    </div>
  </main>;
}
