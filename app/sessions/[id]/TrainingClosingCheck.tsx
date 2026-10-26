"use client";

import { useEffect, useRef, useState } from "react";
import { getPlayerDisplayName } from "@/lib/player-display";
import type { Player } from "./session-types";
import AttendanceReviewClient from "./attendance-review/AttendanceReviewClient";

type Answer = "yes" | "no" | null;
type Rule = { rule_key: string; label: string; reason: string; type: string; value: string };
type Incident = { id: number; player_id: number; reason: string; value: string; type: string };
type Props = {
  sessionId: number;
  players: Player[];
  presentIds: number[];
  onReadyChange: (ready: boolean) => void;
};

export default function TrainingClosingCheck({ sessionId, players, presentIds, onReadyChange }: Props) {
  const [presentOk, setPresentOk] = useState<Answer>(null);
  const [punctualOk, setPunctualOk] = useState<Answer>(null);
  const [specialEvents, setSpecialEvents] = useState<Answer>(null);
  const [exceptionsConfirmed, setExceptionsConfirmed] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [cashboxEnabled, setCashboxEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ruleKey, setRuleKey] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [note, setNote] = useState("");
  const requestIdRef = useRef<string | null>(null);

  const storageKey = "strikr-closing-check-" + sessionId;
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "null") as
        { presentOk?: Answer; punctualOk?: Answer; specialEvents?: Answer; exceptionsConfirmed?: boolean } | null;
      if (saved) {
        setPresentOk(saved.presentOk ?? null);
        setPunctualOk(saved.punctualOk ?? null);
        setSpecialEvents(saved.specialEvents ?? null);
        setExceptionsConfirmed(saved.exceptionsConfirmed === true);
      }
    } catch { /* Local progress is optional. */ }
  }, [storageKey]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/close-check`, { cache: "no-store", signal: controller.signal });
        const data = await response.json() as { enabled?: boolean; rules?: Rule[]; incidents?: Incident[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Mannschaftskasse konnte nicht geladen werden.");
        if (!controller.signal.aborted) {
          setRules(data.rules ?? []);
          setIncidents(data.incidents ?? []);
          setCashboxEnabled(data.enabled === true);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Vorfall-Erfassung nicht verfügbar.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [sessionId]);

  const hasExceptions = presentOk === "no" || punctualOk === "no" || specialEvents === "yes";
  const allAnswered = presentOk !== null && punctualOk !== null && specialEvents !== null;
  const ready = allAnswered && (!hasExceptions || exceptionsConfirmed);
  useEffect(() => { onReadyChange(ready); }, [onReadyChange, ready]);

  function updateAnswers(next: { presentOk?: Answer; punctualOk?: Answer; specialEvents?: Answer }) {
    const values = {
      presentOk: next.presentOk === undefined ? presentOk : next.presentOk,
      punctualOk: next.punctualOk === undefined ? punctualOk : next.punctualOk,
      specialEvents: next.specialEvents === undefined ? specialEvents : next.specialEvents,
      exceptionsConfirmed: false,
    };
    setPresentOk(values.presentOk);
    setPunctualOk(values.punctualOk);
    setSpecialEvents(values.specialEvents);
    setExceptionsConfirmed(false);
    try { window.localStorage.setItem(storageKey, JSON.stringify(values)); } catch { /* Optional. */ }
  }

  function acknowledge(value: boolean) {
    setExceptionsConfirmed(value);
    try { window.localStorage.setItem(storageKey, JSON.stringify({ presentOk, punctualOk, specialEvents, exceptionsConfirmed: value })); } catch { /* Optional. */ }
  }

  const attendees = players.filter(player => presentIds.includes(player.id) && !player.is_guest && player.roster_role !== "staff");
  const availableRules = rules.filter(rule => (punctualOk === "no" && rule.rule_key === "late") ||
    (specialEvents === "yes" && ["missed_penalty", "walk_in"].includes(rule.rule_key)));
  const currentRuleKey = availableRules.some(rule => rule.rule_key === ruleKey) ? ruleKey : availableRules[0]?.rule_key ?? "";
  const selectedRule = availableRules.find(rule => rule.rule_key === currentRuleKey);

  async function recordIncident() {
    if (!currentRuleKey || !playerId || busy) return;
    setBusy(true); setError(""); setNotice("");
    if (!requestIdRef.current) requestIdRef.current = crypto.randomUUID();
    try {
      const response = await fetch(`/api/sessions/${sessionId}/close-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: Number(playerId), ruleKey: currentRuleKey, note, requestId: requestIdRef.current }),
      });
      const data = await response.json() as { error?: string; penaltyId?: number };
      if (!response.ok) throw new Error(data.error ?? "Vorfall konnte nicht gespeichert werden.");
      setIncidents(prev => [
        { id: data.penaltyId ?? Date.now(), player_id: Number(playerId), reason: selectedRule?.reason ?? "", value: selectedRule?.value ?? "", type: selectedRule?.type ?? "" },
        ...prev,
      ]);
      setNotice("In der Mannschaftskasse erfasst.");
      setPlayerId(""); setNote("");
      requestIdRef.current = null;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
    } finally { setBusy(false); }
  }

  function Question({ number, title, hint, answer, yesLabel, noLabel, setAnswer }: {
    number: number; title: string; hint: string; answer: Answer; yesLabel: string; noLabel: string; setAnswer: (answer: Answer) => void;
  }) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-teal-300">{number}</span>
        <div>
          <h3 className="text-base font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">{hint}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {([{ value: "yes", label: yesLabel }, { value: "no", label: noLabel }] as const).map(option => (
          <button key={option.value} type="button" aria-pressed={answer === option.value}
            onClick={() => setAnswer(option.value)}
            className={`min-h-12 rounded-xl border px-3 py-2 text-sm font-bold transition ${answer === option.value
              ? "border-teal-500 bg-teal-50 text-teal-950 ring-1 ring-teal-300"
              : "border-slate-200 bg-white text-slate-700 hover:border-teal-300"}`}>
            {answer === option.value ? "✓ " : ""}{option.label}
          </button>
        ))}
      </div>
    </section>;
  }

  return <div className="space-y-3">
    <div className="rounded-2xl bg-slate-950 p-4 text-white">
      <div className="text-[11px] font-black uppercase tracking-[.18em] text-teal-300">Letzter Schritt</div>
      <h2 className="mt-2 text-xl font-black">Alles erledigt nach dem Training?</h2>
      <p className="mt-2 text-sm leading-6 text-white/65">Drei kurze Fragen. Wenn alles passt, bist du fertig.</p>
    </div>

    <Question number={1} title="Waren alle erwarteten Spieler da?"
      hint="Hat jeder, der fest zugesagt hatte, auch wirklich teilgenommen?"
      answer={presentOk} yesLabel="Ja, alle da" noLabel="Nein, jemand fehlte"
      setAnswer={value => updateAnswers({ presentOk: value })}/>
    {presentOk === "no" ? <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3">
      <p className="text-sm font-black text-rose-950">Spätabsagen & Nichterscheinen</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        Erfasse konkrete Fälle und entscheide einzeln: entschuldigen oder Strafe bestätigen.
      </p>
      <div className="mt-3"><AttendanceReviewClient sessionId={sessionId} compact /></div>
    </div> : null}

    <Question number={2} title="Waren alle pünktlich?"
      hint="Kam jemand nach Trainingsbeginn?"
      answer={punctualOk} yesLabel="Ja, pünktlich" noLabel="Nein, Verspätung"
      setAnswer={value => updateAnswers({ punctualOk: value })}/>

    <Question number={3} title="Gab es sonstige Vorfälle?"
      hint="Zum Beispiel einen verschossenen Elfmeter oder unangemeldete Teilnehmer."
      answer={specialEvents} yesLabel="Ja, etwas passiert" noLabel="Nein, alles gut"
      setAnswer={value => updateAnswers({ specialEvents: value })}/>

    {(punctualOk === "no" || specialEvents === "yes") ? <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-black text-slate-950">Vorfall in der Mannschaftskasse erfassen</h3>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        Nur wenn du auf „Vorfall bestätigen“ tippst, entsteht eine Strafe.
        Es gelten die Regeln eures Vereins.
      </p>
      {loading ? <p className="mt-3 text-sm text-slate-500">Regeln werden geladen …</p> : !cashboxEnabled
        ? <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">Mannschaftskasse ist nicht aktiviert. Hier wird keine Strafe angelegt.</p>
        : availableRules.length === 0
          ? <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">Keine passende aktive Vereinsregel vorhanden.</p>
          : <>
            <label className="mt-4 block text-xs font-bold text-slate-700">Was ist passiert?
              <select value={currentRuleKey} onChange={event => { setRuleKey(event.target.value); requestIdRef.current = null; }}
                className="mt-1 block min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base">
                {availableRules.map(rule => <option key={rule.rule_key} value={rule.rule_key}>
                  {rule.label} · {rule.value}
                </option>)}
              </select>
            </label>
            <label className="mt-3 block text-xs font-bold text-slate-700">Welcher Spieler?
              <select value={playerId} onChange={event => { setPlayerId(event.target.value); requestIdRef.current = null; }}
                className="mt-1 block min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base">
                <option value="">Spieler auswählen</option>
                {attendees.map(player => <option key={player.id} value={player.id}>{getPlayerDisplayName(player)}</option>)}
              </select>
            </label>
            <label className="mt-3 block text-xs font-bold text-slate-700">Notiz (optional)
              <input value={note} maxLength={300} onChange={event => { setNote(event.target.value); requestIdRef.current = null; }}
                placeholder="Zum Beispiel: Elfmeter übers Tor"
                className="mt-1 block min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base"/>
            </label>
            <button type="button" disabled={!playerId || busy} onClick={() => void recordIncident()}
              className="mt-4 min-h-12 w-full rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-40">
              {busy ? "Speichere …" : "Vorfall bestätigen & erfassen"}
            </button>
          </>}
      {notice ? <p role="status" className="mt-3 text-xs font-bold text-emerald-700">{notice}</p> : null}
      {error ? <p role="alert" className="mt-3 text-xs font-bold text-rose-700">{error}</p> : null}
      {incidents.length > 0 ? <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="text-xs font-black text-slate-700">Bereits für dieses Training erfasst</p>
        <div className="mt-2 space-y-1.5">
          {incidents.map(incident => <p key={incident.id} className="text-xs text-slate-600">
            ✓ {players.find(player => player.id === incident.player_id)
              ? getPlayerDisplayName(players.find(player => player.id === incident.player_id)!)
              : "Spieler"} · {incident.reason} ({incident.value})
          </p>)}
        </div>
      </div> : null}
    </section> : null}

    {hasExceptions ? <label className="flex cursor-pointer gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-4">
      <input type="checkbox" checked={exceptionsConfirmed} onChange={event => acknowledge(event.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-teal-700"/>
      <span className="text-sm font-semibold leading-6 text-slate-800">
        Ich habe die Auffälligkeiten geprüft. Alle nötigen Fälle wurden erfasst oder bewusst ohne Strafe belassen.
      </span>
    </label> : null}

    <div role="status" className={`rounded-xl px-4 py-3 text-sm font-bold ${ready ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
      {ready ? "✓ Abschlusscheck bestätigt. Du kannst das Training abschließen." :
        !allAnswered ? "Bitte alle drei Fragen beantworten." : "Bitte die Auffälligkeiten bestätigen."}
    </div>
  </div>;
}
