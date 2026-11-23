"use client";

import { useMemo, useState } from "react";
import { Check, ClipboardList, Coffee, Shirt, Sparkles } from "lucide-react";

type Player = { id: number; name: string };
type Props = { players: Player[]; present: number[] };

const pastTrainings = [
  { date: "19.11.", attendance: 9, laundry: "Bernd", drinks: "Peter", completed: true },
  { date: "12.11.", attendance: 11, laundry: "Andi", drinks: "Klaus", completed: true },
  { date: "05.11.", attendance: 8, laundry: "Hans", drinks: "Frank", completed: true },
] as const;

export default function RonaldDutiesPreview({ players, present }: Props) {
  const [laundryId, setLaundryId] = useState<number | null>(4);
  const [drinksId, setDrinksId] = useState<number | null>(8);
  const [laundryDone, setLaundryDone] = useState(false);
  const [drinksDone, setDrinksDone] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [rotateCount, setRotateCount] = useState(0);

  const playerNames = useMemo(
    () => new Map(players.map(player => [player.id, player.name])),
    [players]
  );
  const available = players.filter(player => present.includes(player.id));
  const chosenLaundry = laundryId === null ? "–" : playerNames.get(laundryId) ?? "–";
  const chosenDrinks = drinksId === null ? "–" : playerNames.get(drinksId) ?? "–";
  const completed = Number(laundryDone) + Number(drinksDone);

  function rotate() {
    if (available.length < 2) return;
    const next = rotateCount + 1;
    const first = next % available.length;
    const second = (first + Math.max(1, Math.floor(available.length / 2))) % available.length;
    setLaundryId(available[first].id);
    setDrinksId(available[second].id);
    setLaundryDone(false);
    setDrinksDone(false);
    setRotateCount(next);
  }

  function onSelectDuty(value: string, kind: "laundry" | "drinks") {
    const id = value ? Number(value) : null;
    if (kind === "laundry") {
      setLaundryId(id);
      setLaundryDone(false);
    } else {
      setDrinksId(id);
      setDrinksDone(false);
    }
  }

  return (
    <section className="mt-5 space-y-4" aria-label="Beispiel-Dienstplan für Excel-Aufgaben">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">
              Deine Excel-Aufgaben, direkt im Überblick
            </p>
            <h3 className="mt-1 flex items-center gap-2 text-xl font-black text-slate-950">
              <ClipboardList className="h-5 w-5" /> Leibchen & Getränke
            </h3>
          </div>
          <span className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-[11px] font-bold text-amber-900">
            Konzept-Vorschau
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-amber-950">
          So könnte dein Dienstplan die Excel-Liste ersetzen: Spieler zuweisen,
          nach dem Training abhaken und sehen, wer zuletzt dran war.
          <strong> Diese Dienstfunktion ist noch nicht in der echten strikr-App verfügbar.</strong>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {([
          { kind: "laundry" as const, label: "Leibchen waschen", Icon: Shirt, selectedId: laundryId, done: laundryDone, setDone: setLaundryDone },
          { kind: "drinks" as const, label: "Getränke mitbringen", Icon: Coffee, selectedId: drinksId, done: drinksDone, setDone: setDrinksDone },
        ]).map(({ kind, label, Icon, selectedId, done, setDone }) => (
          <div key={kind} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                <Icon className="h-5 w-5 text-slate-800" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-extrabold">{label}</div>
                <div className="text-xs text-slate-500">Nächstes Donnerstagstraining</div>
              </div>
            </div>
            <label htmlFor={"ronald-duty-" + kind} className="mt-4 block text-xs font-semibold text-slate-600">
              Wer übernimmt?
            </label>
            <select
              id={"ronald-duty-" + kind}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900"
              value={selectedId ?? ""}
              onChange={event => onSelectDuty(event.target.value, kind)}
            >
              <option value="">Noch nicht vergeben</option>
              {players.map(player => (
                <option key={player.id} value={player.id}>
                  {player.name}{present.includes(player.id) ? " · dabei" : " · nicht angemeldet"}
                </option>
              ))}
            </select>
            <label className={"mt-4 flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold " +
              (done ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-slate-200 bg-slate-50 text-slate-700")}>
              <input
                type="checkbox"
                className="h-5 w-5 accent-emerald-700"
                checked={done}
                disabled={selectedId === null}
                onChange={event => setDone(event.target.checked)}
              />
              {done ? "Erledigt – danke!" : "Nach Erledigung abhaken"}
            </label>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 px-4 py-3">
        <div className="text-sm">
          <span className="font-black">{completed} von 2 Diensten erledigt</span>
          <span className="mt-0.5 block text-xs text-slate-600">Nur in dieser Demo – keine echte Speicherung</span>
        </div>
        <button
          type="button"
          onClick={rotate}
          disabled={available.length < 2}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-sm ring-1 ring-slate-200 disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4" /> Andere Spieler vorschlagen
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black">Deine Liste statt Excel</h3>
            <p className="mt-0.5 text-xs text-slate-500">Fiktive Verlaufseinträge – nur zur Veranschaulichung</p>
          </div>
          <button
            type="button"
            onClick={() => setShowHistory(value => !value)}
            className="shrink-0 text-xs font-bold text-emerald-800 underline"
          >
            {showHistory ? "Zuklappen" : "Anzeigen"}
          </button>
        </div>
        {showHistory && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[350px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th scope="col" className="py-2 pr-2">Training</th>
                  <th scope="col" className="p-2 text-center">Spieler</th>
                  <th scope="col" className="p-2">Leibchen</th>
                  <th scope="col" className="p-2">Getränke</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-emerald-100 bg-emerald-50/60">
                  <th scope="row" className="py-3 pr-2 text-xs font-extrabold">Nächster Do.</th>
                  <td className="p-2 text-center font-bold">{present.length}</td>
                  <td className="p-2">
                    <span className="font-semibold">{chosenLaundry}</span>
                    {laundryDone && <Check className="ml-1 inline h-3.5 w-3.5 text-emerald-700" aria-label="Erledigt" />}
                  </td>
                  <td className="p-2">
                    <span className="font-semibold">{chosenDrinks}</span>
                    {drinksDone && <Check className="ml-1 inline h-3.5 w-3.5 text-emerald-700" aria-label="Erledigt" />}
                  </td>
                </tr>
                {pastTrainings.map(training => (
                  <tr key={training.date} className="border-b border-slate-100 last:border-b-0">
                    <th scope="row" className="py-3 pr-2 font-semibold">{training.date}</th>
                    <td className="p-2 text-center">{training.attendance}</td>
                    <td className="p-2">{training.laundry} <Check className="inline h-3 w-3 text-emerald-600" aria-label="Erledigt" /></td>
                    <td className="p-2">{training.drinks} <Check className="inline h-3 w-3 text-emerald-600" aria-label="Erledigt" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Die Anwesenheitsfunktion gibt es bereits in strikr. Die Dienstzuordnung
          und die Diensthistorie sind hier eine interaktive Produktidee – keine
          aktivierte Funktion für echte Vereine.
        </p>
      </div>
    </section>
  );
}
