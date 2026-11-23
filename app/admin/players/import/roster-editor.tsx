"use client";

import { useState } from "react";

type Player = { name: string; email: string; selected: boolean };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_IMAGE_BYTES = 3_000_000;

function parseList(value: string): Player[] {
  return value.split(/\r?\n/).map(line => {
    const original = line.trim();
    if (!original) return null;
    // Supports plain email lists, spreadsheets, "Name; email" and "Name <email>".
    const emailMatch = original.match(/[^\s;,\t<>]+@[^\s;,\t<>]+\.[^\s;,\t<>]+/);
    const email = emailMatch ? emailMatch[0].toLowerCase() : "";
    const name = (emailMatch ? original.replace(emailMatch[0], "") : original)
      .replace(/[;<>,]/g, " ").replace(/\s+/g, " ").trim();
    return { name, email, selected: true };
  }).filter((value): value is Player => value !== null);
}

function validRow(player: Player) {
  return player.name.trim().length > 0 &&
    player.name.length <= 120 &&
    !/[;\r\n]/.test(player.name) &&
    (!player.email.trim() || EMAIL.test(player.email.trim()));
}

export default function RosterEditor({ action }: { action: (data: FormData) => Promise<void> }) {
  const [raw, setRaw] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<"image" | "text" | null>(null);

  async function scan(file?: File) {
    if (!file) return;
    setError("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Bitte einen PNG-, JPG- oder WebP-Screenshot verwenden.");
      return;
    }
    if (!file.size || file.size > MAX_IMAGE_BYTES) {
      setError("Screenshot zu groß (maximal 3 MB). Bitte zuschneiden oder verkleinern.");
      return;
    }

    setBusy(true);
    try {
      const data = new FormData();
      data.set("image", file);
      const response = await fetch("/api/admin/players/scan", {
        method: "POST",
        body: data,
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erkennung fehlgeschlagen");
      if (!Array.isArray(result.players) || !result.players.length) {
        throw new Error("Keine Namen oder E-Mail-Adressen erkannt.");
      }
      const entries: Player[] = result.players.map((p: { name: string; email: string }) => ({
        name: p.name || "",
        email: p.email || "",
        selected: true,
      }));
      setPlayers(entries);
      setSource("image");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erkennung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  function previewText() {
    const entries = parseList(raw);
    if (entries.length > 25) {
      setError("Bitte maximal 25 Spieler auf einmal importieren.");
      return;
    }
    if (!entries.length) {
      setError("Bitte zuerst Namen oder E-Mail-Adressen einfügen.");
      return;
    }
    setPlayers(entries);
    setSource("text");
    setError("");
  }

  const selected = players.filter(p => p.selected);
  const invalid = selected.filter(p => !validRow(p));
  const seenNames = new Set<string>();
  const seenEmails = new Set<string>();
  const duplicated = new Set<number>();
  players.forEach((p, index) => {
    if (!p.selected) return;
    const name = p.name.trim().toLocaleLowerCase("de-DE");
    const email = p.email.trim().toLowerCase();
    if ((name && seenNames.has(name)) || (email && seenEmails.has(email))) {
      duplicated.add(index);
    }
    if (name) seenNames.add(name);
    if (email) seenEmails.add(email);
  });
  const canSubmit = selected.length > 0 && invalid.length === 0 && duplicated.size === 0 && !busy;
  const update = (index: number, field: "name" | "email", value: string) =>
    setPlayers(old => old.map((p, i) => i === index ? { ...p, [field]: value } : p));

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="text-base font-semibold">1. Screenshot erkennen lassen</h2>
        <p className="text-sm text-slate-600">Screenshot aus Excel, einer Spieler-/Kontaktliste oder einer E-Mail-Verteilerliste hochladen. Auch E-Mail-Adressen ohne Namen werden erkannt und können danach ergänzt werden.</p>
        <div
          tabIndex={0}
          role="group"
          aria-label="Screenshot einfügen oder ablegen"
          onPaste={event => {
            const image = Array.from(event.clipboardData.items).find(item => item.type.startsWith("image/"));
            if (image) { event.preventDefault(); void scan(image.getAsFile() || undefined); }
          }}
          onDragOver={event => event.preventDefault()}
          onDrop={event => {
            event.preventDefault();
            void scan(event.dataTransfer.files[0]);
          }}
          className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <label className="block text-sm font-semibold" htmlFor="roster-image">Bild auswählen oder hier ablegen</label>
          <input
            id="roster-image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={event => void scan(event.target.files?.[0])}
            className="mt-2 block w-full text-sm"
          />
          <p className="mt-2 text-xs text-slate-500">Tipp: Zum Einfügen eines kopierten Screenshots hier klicken und Strg+V drücken.</p>
        </div>
        <p className="text-xs text-slate-500">
          Maximal 3 MB, 25 Einträge pro Vorgang. Das Bild wird ohne dauerhafte Speicherung in strikr
          zur Erkennung an den KI-Anbieter über Vercel AI Gateway übertragen.
          Bitte nur erforderliche Personendaten hochladen und andere Inhalte vorher zuschneiden.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="text-base font-semibold">Alternativ: Liste einfügen</h2>
        <p className="text-sm text-slate-600">Pro Zeile ein Spieler: Name; E-Mail. Nur Namen oder nur E-Mail-Adressen sind ebenfalls möglich.</p>
        <textarea
          value={raw}
          onChange={event => setRaw(event.target.value)}
          rows={5}
          maxLength={6000}
          placeholder={"Thomas Müller; thomas@example.de\nStefan Weber; stefan@example.de\nMichael Braun\nandreas@example.de"}
          className="w-full rounded-xl border border-slate-300 p-3 text-sm"
        />
        <button
          type="button"
          disabled={busy}
          onClick={previewText}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Liste prüfen
        </button>
      </section>

      {busy && <p role="status" className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900">KI erkennt Namen und E-Mail-Adressen …</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {players.length > 0 && (
        <form action={action} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">2. Vorschau prüfen und korrigieren</h2>
              <p className="text-xs text-slate-500">
                {source === "image" ? "KI-Erkennung" : "Textimport"} · {selected.length} von {players.length} ausgewählt
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPlayers(old => old.map(p => ({ ...p, selected: true })))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs">Alle wählen</button>
              <button type="button" onClick={() => setPlayers(old => old.map(p => ({ ...p, selected: false })))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs">Alle abwählen</button>
            </div>
          </div>

          {players.map((p, index) => (
            <div key={index} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={p.selected}
                aria-label={"Spieler " + (index + 1) + " importieren"}
                onChange={event => setPlayers(old => old.map((x, i) => i === index ? { ...x, selected: event.target.checked } : x))}
              />
              <div className="min-w-0 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    aria-label={"Name Spieler " + (index + 1)}
                    value={p.name}
                    onChange={event => update(index, "name", event.target.value)}
                    placeholder="Name ergänzen"
                    maxLength={120}
                    className="min-w-0 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    aria-label={"E-Mail Spieler " + (index + 1)}
                    type="email"
                    value={p.email}
                    onChange={event => update(index, "email", event.target.value)}
                    placeholder="E-Mail optional"
                    maxLength={254}
                    className="min-w-0 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                {p.selected && !validRow(p) && <p className="text-xs text-amber-700">Bitte einen Namen und gegebenenfalls eine gültige E-Mail-Adresse ergänzen.</p>}
                {p.selected && duplicated.has(index) && <p className="text-xs text-amber-700">Doppelter Name oder doppelte E-Mail in der Vorschau.</p>}
              </div>
            </div>
          ))}

          <button type="button"
            onClick={() => setPlayers(old => [...old, { name: "", email: "", selected: true }])}
            disabled={players.length >= 25}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40">
            + Spieler ergänzen
          </button>
          <input
            type="hidden"
            name="roster"
            value={selected.map(p => p.name.trim() + ";" + p.email.trim().toLowerCase()).join("\n")}
          />
          {!canSubmit && selected.length > 0 && <p className="text-xs text-amber-700">Bitte die markierten Zeilen korrigieren, bevor du importierst.</p>}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {selected.length} Spieler endgültig übernehmen
          </button>
          <p className="text-xs text-slate-500">
            Erst nach diesem Klick werden Spieler angelegt. Bestehende Spieler werden nicht verändert;
            doppelte Datensätze werden serverseitig übersprungen.
          </p>
        </form>
      )}
    </div>
  );
}
