"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_WHEEL_SEGMENTS, WHEEL_COLORS, WHEEL_FIELD_COUNTS,
  equalizeWheelSegments, resizeWheelSegments, applyWheelChancePreset, favorWheelSegments,
  type WheelSegment, type WheelEffect,
} from "@/lib/cashbox/wheel-config";

export default function WheelSettingsEditor({ initialSegments, scopeKey="", pilot=false }: { initialSegments: WheelSegment[]; scopeKey?:string; pilot?:boolean }) {
  const [segments, setSegments] = useState<WheelSegment[]>(initialSegments.map((s) => ({ ...s })));
  const [preferredIds, setPreferredIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const total = useMemo(() => segments.reduce((sum, item) => sum + item.weight, 0), [segments]);
  const luckTotal = segments.filter((segment) => segment.category === "luck")
    .reduce((sum, segment) => sum + segment.weight, 0);
  const challengeTotal = total - luckTotal;
  const valid = total === 100 && WHEEL_FIELD_COUNTS.some((count) => count === segments.length) &&
    segments.every((item) => (!pilot || (!!item.effect && (item.effect!=="fixed_money" || /^[0-9]{1,6}([.,][0-9]{1,2})?$/.test(item.effectValue||"")))) && item.icon.trim() && item.label.trim() &&
      Number.isInteger(item.weight) && item.weight > 0 && item.weight <= 99 &&
      item.label.trim().length <= 28 && item.description.length <= 120 &&
      [...item.icon.trim()].length <= 8);

  function edit(id: string, field: "icon"|"label"|"description"|"weight"|"category"|"effect"|"effectValue", value: string) {
    setSaved("");
    setError("");
    setSegments((previous) => previous.map((item) => {
      if (item.id !== id) return item;
      if (field === "effect") return { ...item, effect:value as WheelEffect, effectValue:value==="fixed_money" ? (item.effectValue||"2") : "" };
      if (field === "category") return {
        ...item, category: value === "luck" ? "luck" as const : "challenge" as const,
      };
      return { ...item, [field]: field === "weight" ? Number(value) : value };
    }));
  }

  function changeCount(count: 4 | 6 | 8) {
    setSegments((previous) => resizeWheelSegments(previous, count));
    setPreferredIds([]);
    setSaved("");
    setError("");
  }

  function applyPreset(preset: "equal" | "50" | "60" | "40") {
    setSegments((previous) => preset === "equal"
      ? equalizeWheelSegments(previous)
      : applyWheelChancePreset(previous, Number(preset) as 40 | 50 | 60));
    setPreferredIds([]);
    setSaved("");
    setError("");
  }

  function togglePreferred(id: string) {
    setPreferredIds((previous) => previous.includes(id)
      ? previous.filter((item) => item !== id)
      : [...previous, id]);
    setSaved("");
    setError("");
  }

  function applyPreferred() {
    if (!preferredIds.length || preferredIds.length >= segments.length) return;
    setSegments((previous) => favorWheelSegments(previous, preferredIds));
    setSaved("");
    setError("");
  }

  async function save() {
    if (saving || !valid) return;
    setSaving(true);
    setSaved("");
    setError("");
    try {
      const response = await fetch("/api/penalties/wheel-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments, scopeKey }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Speichern fehlgeschlagen.");
      setSaved(result.message || "Rad gespeichert.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Das Rad konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-base font-black text-slate-950">So sieht dein Schicksalsrad aus</h2>
          <p className="mt-1 text-xs text-slate-600">
            Mehr Felder = kleinere Tortenstücke. Wähle 4, 6 oder 8 Felder und einen Chancen-Vorschlag.
          </p>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-700">
            1 · Anzahl der Felder
          </p>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Anzahl der Rad-Felder">
            {WHEEL_FIELD_COUNTS.map((count) => (
              <button key={count} type="button" aria-pressed={segments.length === count}
                onClick={() => changeCount(count)}
                className={`rounded-xl border px-3 py-3 text-center text-sm font-black transition
                  ${segments.length === count
                    ? "border-cyan-600 bg-cyan-600 text-white shadow-md"
                    : "border-slate-200 bg-white text-slate-800 hover:border-cyan-400"}`}>
                🎡 {count} Felder
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            Beim Wechsel bleiben vorhandene Texte erhalten. Zusätzliche Felder bekommen Vorschläge und
            die Prozente werden zunächst möglichst gleich verteilt.
          </p>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-700">
            2 · Chancen per Klick verteilen
          </p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: "equal", label: "⚖️ Fair verteilen", hint: "Alle Felder erhalten nahezu die gleiche Chance" },
              { id: "50", label: "🎯 50 / 50", hint: "Glück und Pech gleich" },
              { id: "60", label: "🍀 60 / 40", hint: "60 % Glück · 40 % Pech" },
              { id: "40", label: "🔥 40 / 60", hint: "40 % Glück · 60 % Pech" },
            ] as const).map((preset) => (
              <button key={preset.id} type="button" onClick={() => applyPreset(preset.id)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:border-cyan-400 hover:bg-cyan-50">
                <span className="block text-xs font-black text-slate-950">{preset.label}</span>
                <span className="mt-1 block text-[10px] font-medium text-slate-600">{preset.hint}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            Glück oder Pech kannst du unten pro Feld festlegen. Die Vorschläge ändern nur die
            Wahrscheinlichkeiten – keine echten Geld- oder Bierstrafen.
          </p>

          <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50/70 p-3">
            <p className="text-xs font-black text-cyan-950">⭐ Einzelne Felder häufiger treffen lassen</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-700">
              Markiere unten z. B. <b>Feld 1</b> und <b>Feld 2</b> mit „⭐ Häufiger“.
              Danach verteilen wir 100 % automatisch. Markierte Felder haben jeweils
              ungefähr die doppelte Chance gegenüber einem nicht markierten Feld.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-cyan-900">
                {preferredIds.length} von {segments.length} Feldern markiert
              </span>
              <button type="button" onClick={applyPreferred}
                disabled={preferredIds.length === 0 || preferredIds.length === segments.length}
                className="rounded-xl bg-cyan-700 px-4 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
                ⭐ Markierte Felder häufiger
              </button>
            </div>
            {preferredIds.length === segments.length && (
              <p className="mt-2 text-[11px] font-semibold text-amber-900">
                Wenn alle Felder markiert sind, kann keines häufiger sein. Mindestens eines abwählen.
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wide text-slate-700">
            3 · Felder bearbeiten
          </h3>
          <span className="text-[11px] font-bold text-cyan-800">{segments.length} Felder</span>
        </div>
        <div className="mt-4 space-y-3">
          {segments.map((segment, index) => (
            <div key={segment.id}
              className={`rounded-xl border p-3 ${preferredIds.includes(segment.id)
                ? "border-cyan-500 bg-cyan-50/70 ring-1 ring-cyan-200"
                : "border-slate-200 bg-slate-50"}`}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-lg text-white"
                    style={{ backgroundColor: WHEEL_COLORS[index % WHEEL_COLORS.length] }}>{segment.icon || "🎡"}</span>
                  <span className="text-sm font-black text-slate-900">Feld {index + 1}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold
                    ${segment.category === "luck" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                    {segment.category === "luck" ? "🍀 Glück" : "🔥 Pech"}
                  </span>
                  <button type="button" onClick={() => togglePreferred(segment.id)}
                    aria-pressed={preferredIds.includes(segment.id)}
                    aria-label={`Feld ${index + 1}: ${segment.label} ${preferredIds.includes(segment.id) ? "nicht mehr bevorzugen" : "häufiger treffen lassen"}`}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition
                      ${preferredIds.includes(segment.id)
                        ? "border-cyan-700 bg-cyan-700 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-cyan-500"}`}>
                    {preferredIds.includes(segment.id) ? "★ Häufiger gewählt" : "☆ Häufiger"}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-[80px_1fr_104px] gap-2">
                <label className="text-[11px] font-bold text-slate-600">
                  Symbol
                  <input value={segment.icon} maxLength={12}
                    onChange={(event) => edit(segment.id, "icon", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-base text-slate-950"/>
                </label>
                <label className="text-[11px] font-bold text-slate-600">
                  Name
                  <input value={segment.label} maxLength={28}
                    onChange={(event) => edit(segment.id, "label", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-base text-slate-950"/>
                </label>
                <label className="text-[11px] font-bold text-slate-600">
                  Chance %
                  <input type="number" min={1} max={99} step={1}
                    value={Number.isFinite(segment.weight) ? segment.weight : ""}
                    onChange={(event) => edit(segment.id, "weight", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-base text-slate-950"/>
                </label>
              </div>
              <label className="mt-2 block text-[11px] font-bold text-slate-600">
                Ist das ein gutes oder schlechtes Ergebnis?
                <select value={segment.category || "challenge"}
                  onChange={(event) => edit(segment.id, "category", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
                  <option value="luck">🍀 Glück · gut für den Spieler</option>
                  <option value="challenge">🔥 Pech · kleine Kabinen-Challenge</option>
                </select>
              </label>
              {pilot ? <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50 p-3">
                <label className="block text-xs font-black text-teal-950">Wirkung auf die ursprüngliche Strafe
                  <select value={segment.effect||"keep"} onChange={event=>edit(segment.id,"effect",event.target.value)}
                    className="mt-1 w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm text-slate-900">
                    <option value="keep">Ursprüngliche Strafe bleibt (keine Zusatzstrafe)</option>
                    <option value="waive">Strafe entfällt (Joker)</option>
                    <option value="halve">Geldstrafe halbieren (nur bei Geld)</option>
                    <option value="fixed_money">Ersetzt durch festen Geldbetrag</option>
                    <option value="task">Ersetzt durch Aufgabe / Challenge</option>
                    <option value="goods">Ersetzt durch Sachleistung (z. B. Kiste)</option>
                  </select>
                </label>
                {segment.effect==="fixed_money"?<label className="mt-2 block text-xs font-black text-teal-950">
                  Neuer Geldbetrag in €
                  <input className="mt-1 w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm"
                    inputMode="decimal" value={segment.effectValue||""} placeholder="z. B. 2,50"
                    onChange={event=>edit(segment.id,"effectValue",event.target.value)}/>
                </label>:null}
                {(segment.effect==="task"||segment.effect==="goods")?<p className="mt-2 text-xs text-teal-900">
                  Die Beschreibung unten wird zur verbindlichen neuen Aufgabe/Sachleistung.
                </p>:null}
              </div>:null}
              <label className="mt-2 block text-[11px] font-bold text-slate-600">
                Was bedeutet dieses Feld?
                <input value={segment.description} maxLength={120}
                  onChange={(event) => edit(segment.id, "description", event.target.value)}
                  placeholder="z. B. Beste Ausrede im Kabinen-Talk erzählen"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-950"/>
              </label>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => applyPreset("equal")}
            className="rounded-xl border border-cyan-200 bg-white px-3 py-3 text-xs font-black text-cyan-900 hover:bg-cyan-50">
            ⚖️ Fair verteilen
          </button>
          <button type="button" onClick={applyPreferred}
            disabled={preferredIds.length === 0 || preferredIds.length === segments.length}
            className="rounded-xl bg-cyan-700 px-3 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
            ⭐ Markierte häufiger
          </button>
        </div>
        <p className="mt-2 text-[11px] font-medium text-slate-500">
          Die Vorschläge gelten sofort für die Prozentwerte. Erst „Schicksalsrad für den Verein speichern“ macht sie für Spieler aktiv.
        </p>
        <div className="mt-4 overflow-hidden rounded-full bg-slate-100">
          <div className="flex h-4 w-full">
            {segments.map((segment, index) => (
              <div key={segment.id} title={`${segment.label}: ${segment.weight}%`}
                style={{
                  width: `${total ? segment.weight / total * 100 : 0}%`,
                  backgroundColor: WHEEL_COLORS[index % WHEEL_COLORS.length],
                }}/>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="text-xs font-bold text-emerald-800">🍀 Glück: {luckTotal} %</p>
          <p className="text-xs font-bold text-amber-800">🔥 Pech: {challengeTotal} %</p>
          <p className="text-xs font-bold text-slate-700">
            Summe: <span className={total === 100 ? "text-emerald-700" : "text-rose-700"}>
              {total} %
            </span> von 100 %
          </p>
          {total !== 100 && <p className="text-xs font-bold text-rose-700">
            Noch {Math.abs(100-total)} % {total > 100 ? "reduzieren" : "verteilen"}
          </p>}
        </div>
        <button type="button" disabled={!valid || saving} onClick={() => void save()}
          className="mt-4 w-full rounded-xl bg-cyan-600 px-4 py-3.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
          {saving ? "Rad wird gespeichert …" : "🎡 Schicksalsrad für den Verein speichern"}
        </button>
        {saved && <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-800">{saved}</p>}
        {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-800">{error}</p>}
      </div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <h3 className="text-sm font-black text-amber-950">Wichtige Spielregeln</h3>
        <p className="mt-1 text-xs leading-5 text-amber-950">
          {pilot
            ? "Jedes Feld bestimmt ausdrücklich, was mit der ursprünglichen Strafe geschieht. Es entsteht keine zusätzliche Forderung. Neue Einstellungen gelten erst für künftige Drehungen; alte Ergebnisse bleiben als Snapshot bestehen."
            : "Die Felder legen das sichtbare Spaß-Ergebnis fest. Bereits gedrehte Strafen behalten ihr ursprüngliches Ergebnis, auch wenn du die Felder änderst."}
        </p>
        <button type="button" onClick={() => { setSegments(equalizeWheelSegments(DEFAULT_WHEEL_SEGMENTS.map((s) => ({...s}))));setPreferredIds([]);setSaved(""); }}
          className="mt-3 text-xs font-bold text-cyan-800 underline underline-offset-2">
          4 Standardfelder gleichmäßig laden (erst nach Speichern aktiv)
        </button>
      </div>
    </section>
  );
}
