"use client";
import { useActionState } from "react";
import { submitPilotFeedback, type FeedbackState } from "./actions";
const fields=[
 {id:"setup",q:"Wie einfach war die Einrichtung eures Vereins?",opts:["Sehr einfach","Eher einfach","Eher schwierig","Sehr schwierig"]},
 {id:"invite",q:"Wie gut hat das Einladen bzw. Anlegen der Spieler funktioniert?",opts:["Sehr gut","Gut","Mit Schwierigkeiten","Noch nicht ausprobiert"]},
 {id:"usage",q:"Wie weit seid ihr mit strikr im Trainingsalltag?",opts:["Regelmäßig im Einsatz","Einige Trainings getestet","Bisher nur eingerichtet","Noch nicht genutzt"]},
 {id:"useful",q:"Welche Funktion ist für dich als Admin am wertvollsten?",opts:["Zu- und Absagen","Faire Teams generieren","Ergebnisse / Tabelle","Spielerübersicht / Statistiken","Mannschaftskasse / Bierkasse","Sonstiges"]},
 {id:"teams",q:"Wie gut funktioniert die Teamzusammenstellung?",opts:["Sehr gut","Gut, aber Verbesserungsbedarf","Nicht zufrieden","Noch nicht ausprobiert"]},
 {id:"issues",q:"Wo bist du hängen geblieben oder was hat dich genervt?",free:true},
 {id:"missing",q:"Welche Funktion oder Einstellung fehlt dir als Admin?",free:true},
 {id:"recommend",q:"Würdest du strikr einem anderen Trainer oder Teamadmin empfehlen?",opts:["Ja","Vielleicht","Nein","Noch zu früh"]},
 {id:"pro",q:"Wäre strikr Pro für 4,99 € pro Monat für das gesamte Team interessant?",opts:["Ja","Vielleicht","Nein","Noch nicht beurteilbar"]},
 {id:"improvement",q:"Was sollten wir als Erstes verbessern, damit strikr für euch unverzichtbar wird?",free:true}
] as const;
export default function FeedbackForm(){const [state,action,pending]=useActionState<FeedbackState,FormData>(submitPilotFeedback,{});
 if(state.success)return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900"><h2 className="text-xl font-bold">Danke für dein Feedback! ⚽</h2><p className="mt-2">Deine Antworten wurden gespeichert.</p></div>;
 return <form action={action} className="space-y-5">{fields.map((f,i)=><fieldset key={f.id} className="rounded-2xl border border-slate-200 bg-white p-4"><legend className="sr-only">{f.q}</legend><label htmlFor={f.id} className="mb-3 block text-sm font-semibold text-slate-900">{i+1}. {f.q}</label>{"free" in f&&f.free?<textarea id={f.id} name={f.id} required maxLength={2500} rows={3} className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900" placeholder="Deine ehrliche Einschätzung …"/>:"opts" in f&&f.opts?<div className="space-y-2">{f.opts.map(option=><label key={option} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2 text-sm text-slate-800"><input type="radio" name={f.id} value={option} required className="h-4 w-4 accent-slate-900"/>{option}</label>)}</div>:null}</fieldset>)}{state.error&&<p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p>}<button type="submit" disabled={pending} className="w-full rounded-xl bg-slate-950 px-5 py-4 font-semibold text-white disabled:opacity-60">{pending?"Wird gespeichert …":"Feedback absenden"}</button><p className="text-center text-xs text-slate-500">Nur für persönlich eingeladene Testpersonen. Deine Antworten werden dem Verein zugeordnet.</p></form>}
