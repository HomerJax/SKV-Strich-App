"use client";

import { useMemo, useState } from "react";
import { getPlayerDisplayName } from "@/lib/player-display";
import type { Player } from "./session-types";

type Props = {
  players: Player[];
  selectedIds: number[];
  dirty: boolean;
  saving: boolean;
  locked: boolean;
  onToggle: (playerId: number) => void;
  onSave: () => void;
  showGuestForm: boolean;
  guestName: string;
  guestPosition: Player["preferred_position"] | "";
  guestAgeGroup: Player["age_group"] | "";
  guestStrength: string;
  guestSaving: boolean;
  onToggleShowGuestForm: () => void;
  onGuestNameChange: (value: string) => void;
  onGuestPositionChange: (value: Player["preferred_position"] | "") => void;
  onGuestAgeGroupChange: (value: Player["age_group"] | "") => void;
  onGuestStrengthChange: (value: string) => void;
  onAddGuestPlayer: () => void;
};

export default function TrainingAttendanceStep({
  players, selectedIds, dirty, saving, locked, onToggle, onSave,
  showGuestForm, guestName, guestPosition, guestAgeGroup, guestStrength, guestSaving,
  onToggleShowGuestForm, onGuestNameChange, onGuestPositionChange,
  onGuestAgeGroupChange, onGuestStrengthChange, onAddGuestPlayer,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "present" | "missing">("all");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visiblePlayers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("de-DE");
    return players.filter((player) => {
      if (filter === "present" && !selectedSet.has(player.id)) return false;
      if (filter === "missing" && selectedSet.has(player.id)) return false;
      return !query || getPlayerDisplayName(player).toLocaleLowerCase("de-DE").includes(query);
    });
  }, [players, filter, search, selectedSet]);
  const presentCount = players.filter((player) => selectedSet.has(player.id)).length;

  return (
    <section aria-label="Anwesenheiten auswählen" className="space-y-4">
      <div className="rounded-2xl bg-slate-950 p-4 text-white">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-teal-300">
          Schritt 1 · Wer ist wirklich da?
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-3xl font-black tabular-nums">{presentCount} <span className="text-base text-slate-300">anwesend</span></p>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Mehrere Spieler auswählen. Gespeichert wird erst über den Button.
            </p>
          </div>
          <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-400 text-2xl font-black text-slate-950">
            ✓
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <label htmlFor="training-attendance-search" className="block text-sm font-bold text-slate-800">
          Spielerliste
        </label>
        <input
          id="training-attendance-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Spieler suchen …"
          className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
        <div role="group" aria-label="Spieler filtern" className="mt-3 flex gap-2">
          {([
            ["all", "Alle"],
            ["present", "Dabei"],
            ["missing", "Nicht dabei"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={filter === key
                ? "min-h-10 flex-1 rounded-xl bg-slate-950 px-2 text-xs font-bold text-white"
                : "min-h-10 flex-1 rounded-xl bg-slate-100 px-2 text-xs font-bold text-slate-700"}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {visiblePlayers.map((player) => {
            const checked = selectedSet.has(player.id);
            const name = getPlayerDisplayName(player);
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => onToggle(player.id)}
                disabled={locked || saving}
                aria-pressed={checked}
                aria-label={name + (checked ? " abwählen" : " als anwesend markieren")}
                className={checked
                  ? "flex min-h-16 w-full items-center gap-3 rounded-xl border-2 border-teal-500 bg-teal-50 px-3 py-2.5 text-left transition disabled:opacity-60"
                  : "flex min-h-16 w-full items-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-teal-300 disabled:opacity-60"}
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 bg-cover bg-center text-sm font-extrabold uppercase text-white"
                  style={player.photo_url ? { backgroundImage: "url(" + JSON.stringify(player.photo_url) + ")" } : undefined}
                >
                  {!player.photo_url ? (name.trim().charAt(0) || "?") : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold text-slate-950">{name}</span>
                  <span className="mt-0.5 block text-xs font-medium text-slate-500">
                    {player.is_guest ? "Gast" : player.rsvp_status === "in" ? "Zugesagt" : player.rsvp_status === "out" ? "Abgesagt" : "Rückmeldung offen"}
                  </span>
                </span>
                <span aria-hidden="true" className={checked
                  ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-lg font-black text-white"
                  : "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-slate-300 text-white"}
                >
                  {checked ? "✓" : ""}
                </span>
              </button>
            );
          })}
          {visiblePlayers.length === 0 ? (
            <p className="col-span-full rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">Keine passenden Spieler gefunden.</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <button
          type="button"
          onClick={onToggleShowGuestForm}
          disabled={locked || guestSaving}
          className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-extrabold text-slate-900 disabled:opacity-60"
          aria-expanded={showGuestForm}
        >
          <span>＋ Gastspieler hinzufügen</span><span>{showGuestForm ? "−" : "＋"}</span>
        </button>
        {showGuestForm && !locked ? (
          <div className="mt-3 space-y-3 border-t border-slate-100 pt-4">
            <label className="block text-xs font-bold text-slate-700">
              Name des Gasts
              <input value={guestName} onChange={(e) => onGuestNameChange(e.target.value)}
                placeholder="Vor- und Nachname"
                className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-3 text-base" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-slate-700">
                Position
                <select value={guestPosition ?? ""} onChange={(e) => onGuestPositionChange(e.target.value as Player["preferred_position"] | "")}
                  className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-2 text-base">
                  <option value="">Offen</option><option value="goalkeeper">Torwart</option>
                  <option value="defense">Hinten</option><option value="attack">Vorne</option>
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Kategorie
                <select value={guestAgeGroup ?? ""} onChange={(e) => onGuestAgeGroupChange(e.target.value as Player["age_group"] | "")}
                  className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-2 text-base">
                  <option value="">Offen</option><option value="AH">AH</option><option value="Ü32">Ü32</option>
                </select>
              </label>
            </div>
            <label className="block text-xs font-bold text-slate-700">
              Stärke (optional)
              <select value={guestStrength} onChange={(e) => onGuestStrengthChange(e.target.value)}
                className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-2 text-base">
                <option value="">Standardstärke</option>
                {[1, 2, 3, 4, 5].map((strength) => (
                  <option key={strength} value={String(strength)}>{strength}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={onAddGuestPlayer} disabled={guestSaving || !guestName.trim()}
              className="min-h-12 w-full rounded-xl bg-slate-950 px-4 text-sm font-extrabold text-white disabled:opacity-40">
              {guestSaving ? "Gast wird angelegt …" : "Gast hinzufügen"}
            </button>
          </div>
        ) : null}
      </div>

      <div className={dirty
        ? "rounded-2xl border-2 border-amber-300 bg-amber-50 p-4"
        : "rounded-2xl border border-emerald-200 bg-emerald-50 p-4"}
      >
        <p className={dirty ? "text-sm font-bold text-amber-950" : "text-sm font-bold text-emerald-900"}>
          {saving ? "Anwesenheit wird gespeichert …" : dirty ? "Auswahl noch nicht gespeichert" : "Anwesenheit ist gespeichert"}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          {dirty ? "Speichere alle Änderungen gemeinsam. Danach kannst du zum Spielmodus wechseln." : "Du kannst die Liste weiter bearbeiten oder zum nächsten Schritt gehen."}
        </p>
        <button
          type="button"
          disabled={!dirty || saving || locked}
          onClick={onSave}
          className="mt-3 min-h-14 w-full rounded-xl bg-teal-500 px-4 text-base font-extrabold text-slate-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {saving ? "Wird gespeichert …" : dirty ? "✓ Anwesenheit speichern" : "✓ Alles gespeichert"}
        </button>
      </div>
    </section>
  );
}
