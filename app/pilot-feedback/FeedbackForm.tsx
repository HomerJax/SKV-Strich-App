"use client";
import { useActionState } from "react";
import { submitPilotFeedback, type FeedbackState } from "./actions";
const fields=[
 {id:"usage",q:"Wie intensiv nutzt ihr strikr aktuell?",opts:["Bei nahezu jedem Training","Regelmäßig, aber nicht immer","Gelegentlich","Aktuell kaum oder gar nicht"]},
 {id:"useful",q:"Was bringt euch als Team den größten Mehrwert?",opts:["Zu- und Absagen / Trainingsplanung","Faire Teams auf Knopfdruck","Ergebnisse, Tabelle und Statistiken","Motivation, Wettbewerb und Spaß","Mannschafts- und Bierkasse","Sonstiges"],multi:true},
 {id:"positive",q:"Was gefällt dir persönlich an strikr besonders gut?",free:true},
 {id:"issues",q:"Was nervt dich oder funktioniert aus deiner Sicht noch nicht gut?",free:true},
 {id:"players_positive",q:"Was kommt bei euren Spielern besonders gut an?",free:true},
 {id:"players_negative",q:"Was kritisieren eure Spieler oder was nutzen sie nicht gerne?",free:true},
 {id:"fairness",q:"Wie fair werden die automatisch generierten Teams empfunden?",opts:["Sehr fair","Überwiegend fair","Oft unausgeglichen","Noch nicht ausreichend getestet"]},
 {id:"missing",q:"Welche Funktion oder Verbesserung fehlt euch am meisten?",free:true},
 {id:"price",q:"Was wäre euch strikr als gesamtes Team monatlich wert?",opts:["0 € – nur kostenlos interessant","1–3 €","4–5 €","6–10 €","Mehr als 10 €","Kann ich noch nicht beurteilen"]},
 {id:"recommend",q:"Würdest du strikr anderen Mannschaften oder Trainern empfehlen?",opts:["Ja, auf jeden Fall","Eher ja","Eher nein","Nein","Noch zu früh für eine Einschätzung"]},
 {id:"other",q:"Was fällt dir sonst noch zu strikr ein? Wünsche, Ideen, Kritik – alles ist willkommen.",free:true}
] as const;
export default function FeedbackForm(){const [state,action,pending]=useActionState<FeedbackState,FormData>(submitPilotFeedback,{});
 if(state.success)return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900"><h2 className="text-xl font-bold">Danke für dein Feedback! ⚽</h2><p className="mt-2">Deine Antworten wurden gespeichert.</p></div>;
 return <form action={action} className="space-y-5">{fields.map((f,i)=><fieldset key={f.id} className="rounded-2xl border border-slate-200 bg-white p-4"><legend className="sr-only">{f.q}</legend><label htmlFor={f.id} className="mb-3 block text-sm font-semibold text-slate-900">{i+1}. {f.q}</label>{"free" in f&&f.free?<textarea id={f.id} name={f.id} maxLength={2500} rows={3} className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900" placeholder="Deine ehrliche Einschätzung …"/>:"opts" in f&&f.opts?<div className="space-y-2">{f.opts.map(option=><label key={option} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2 text-sm text-slate-800"><input type={"multi" in f&&f.multi?"checkbox":"radio"} name={f.id} value={option} className="h-4 w-4 accent-slate-900"/>{option}</label>)}</div>:null}</fieldset>)}{state.error&&<p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p>}<button type="submit" disabled={pending} className="w-full rounded-xl bg-slate-950 px-5 py-4 font-semibold text-white disabled:opacity-60">{pending?"Wird gespeichert …":"Feedback absenden"}</button><p className="text-center text-xs text-slate-500">Nur für persönlich eingeladene Testpersonen. Deine Antworten werden dem Verein zugeordnet.</p></form>}
