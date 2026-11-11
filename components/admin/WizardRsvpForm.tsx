import { FREE_RSVP_DEADLINE_MINUTES } from "@/lib/billing/product-limits";
export default function WizardRsvpForm({value,reason,isPro}:{value:number;reason:boolean;isPro:boolean}){
 return <form method="post" action="/api/admin/settings" className="space-y-4">
  <input type="hidden" name="redirect_to" value="/admin/setup?step=rsvp"/>
  <input type="hidden" name="settings_scope" value="rsvp"/>
  <label className="block text-sm font-semibold">Rückmeldefrist vor Trainingsbeginn (Minuten)
   <input name="rsvp_deadline_minutes_before" type="number" min={0} max={10080} step={15} defaultValue={isPro?value:FREE_RSVP_DEADLINE_MINUTES} disabled={!isPro} className="mt-2 w-full rounded-xl border p-3"/>
  </label>
  {!isPro?<p className="text-xs text-violet-700">Free: feste Rückmeldefrist. Individuelle Fristen gibt es mit PRO.</p>:null}
  <label className="flex items-center gap-3 text-sm"><input name="require_rsvp_reason_on_absence" type="checkbox" defaultChecked={isPro&&reason} disabled={!isPro}/>Absagegrund verpflichtend (PRO)</label>
  <button type="submit" className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">Rückmelderegeln speichern</button>
 </form>;
}