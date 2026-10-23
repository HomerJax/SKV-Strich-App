"use client";

import { useMemo, useState } from "react";
import { DEFAULT_WHEEL_SEGMENTS, WHEEL_COLORS, type WheelSegment } from "@/lib/cashbox/wheel-config";

export default function WheelSettingsEditor({ initialSegments }: { initialSegments: WheelSegment[] }) {
  const [segments, setSegments] = useState<WheelSegment[]>(initialSegments.map((s) => ({ ...s })));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const total = useMemo(() => segments.reduce((sum, item) => sum + item.weight, 0), [segments]);
  const valid = total === 100 && segments.length >= 2 && segments.length <= 10 &&
    segments.every((item) => item.icon.trim() && item.label.trim() &&
      Number.isInteger(item.weight) && item.weight > 0 && item.weight <= 99 &&
      item.label.trim().length <= 28 && item.description.length <= 120 &&
      [...item.icon.trim()].length <= 8);

  function edit(id: string, field: "icon"|"label"|"description"|"weight", value: string) {
    setSaved("");
    setSegments((prev) => prev.map((item) =>
      item.id === id ? { ...item, [field]: field === "weight" ? Number(value) : value } : item));
  }
  function add() {
    if (segments.length >= 10) return;
    const id = `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
    setSegments((prev) => [...prev, {
      id, icon: "🎯", label: "Neues Feld", description: "", weight: 1,
    }]);
    setSaved("");
  }
  function remove(id: string) {
    if (segments.length <= 2) return;
    setSegments((prev) => prev.filter((item) => item.id !== id));
    setSaved("");
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
        body: JSON.stringify({ segments }),
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-950">Deine Rad-Felder</h2>
            <p className="mt-1 text-xs text-slate-600">2–10 Felder · Prozentchancen zusammen genau 100 %</p>
          </div>
          <button type="button" onClick={add} disabled={segments.length >= 10}
            className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:opacity-40">
            + Feld hinzufügen
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {segments.map((segment, index) => (
            <div key={segment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-lg text-white"
                    style={{ backgroundColor: WHEEL_COLORS[index % WHEEL_COLORS.length] }}>{segment.icon || "🎡"}</span>
                  <span className="text-sm font-black text-slate-900">Feld {index + 1}</span>
                </div>
                <button type="button" onClick={() => remove(segment.id)} disabled={segments.length <= 2}
                  className="rounded-lg px-2 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-30">
                  Entfernen
                </button>
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
                Was bedeutet dieses Feld?
                <input value={segment.description} maxLength={120}
                  onChange={(event) => edit(segment.id, "description", event.target.value)}
                  placeholder="z. B. Beste Ausrede im Kabinen-Talk erzählen"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-950"/>
              </label>
            </div>
          ))}
        </div>
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
        <div className="mt-3 flex items-center justify-between">
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
          Die Felder legen das sichtbare Spaß-Ergebnis fest. Strafen, Zahlungen und Bier-Schulden
          werden durch einen Zufallsdreh nicht automatisch verändert. Bereits gedrehte
          Strafen behalten ihr ursprüngliches Ergebnis, auch wenn du die Felder änderst.
        </p>
        <button type="button" onClick={() => { setSegments(DEFAULT_WHEEL_SEGMENTS.map((s) => ({...s})));setSaved(""); }}
          className="mt-3 text-xs font-bold text-cyan-800 underline underline-offset-2">
          Standardfelder in den Editor laden (erst nach Speichern aktiv)
        </button>
      </div>
    </section>
  );
}
