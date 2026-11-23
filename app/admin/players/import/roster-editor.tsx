"use client";

import { useState } from "react";

type Player = { name: string; email: string; selected: boolean };
const parse = (value: string): Player[] => value.split(/\r?\n/).map(line => {
  const [name = "", email = ""] = line.split(/[;\t]/);
  return { name: name.trim(), email: email.trim(), selected: true };
}).filter(p => p.name).slice(0,25);

export default function RosterEditor({ action }: { action: (data: FormData) => Promise<void> }) {
  const [raw, setRaw] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function scan(file?: File) {
    if (!file) return;
    setError(""); setBusy(true);
    try {
      const data = new FormData(); data.set("image", file);
      const response = await fetch("/api/admin/players/scan", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erkennung fehlgeschlagen");
      setPlayers((result.players as {name:string;email:string}[]).map(p => ({ ...p, selected: true })));
    } catch (e) { setError(e instanceof Error ? e.message : "Erkennung fehlgeschlagen"); }
    finally { setBusy(false); }
  }
  const selected = players.filter(p => p.selected && p.name.trim());
  return <div className="space-y-4">
    <div className="rounded-xl border border-slate-200 p-4 space-y-2">
      <label className="block text-sm font-semibold">Screenshot hochladen (KI-Erkennung)</label>
      <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy}
        onChange={e => void scan(e.target.files?.[0])} className="block w-full text-sm" />
      <p className="text-xs text-slate-500">Max. 4 MB. Nur den relevanten Ausschnitt hochladen; das Bild wird zur Erkennung verarbeitet und nicht als Datei gespeichert.</p>
    </div>
    <div className="space-y-2">
      <label className="block text-sm font-semibold">Oder Liste einfügen (Name; E-Mail)</label>
      <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={6} maxLength={6000}
        placeholder={"Thomas Müller; thomas@example.de\nStefan Weber; stefan@example.de\nMichael Braun"}
        className="w-full rounded-xl border border-slate-300 p-3 text-sm" />
      <button type="button" onClick={() => {setPlayers(parse(raw));setError("");}}
        className="rounded-xl border border-slate-300 px-4 py-2 text-sm">Liste prüfen</button>
    </div>
    {busy && <p className="text-sm">Screenshot wird erkannt …</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {players.length > 0 && <form action={action} className="space-y-3">
      <h2 className="font-semibold">Vorschau – bitte vor dem Import kontrollieren</h2>
      {players.map((p,i) => <div key={i} className="grid grid-cols-[auto_1fr] gap-2 rounded-xl border p-3">
        <input type="checkbox" checked={p.selected} aria-label={"Spieler " + (i+1) + " importieren"}
          onChange={e => setPlayers(old => old.map((x,j) => j === i ? {...x, selected:e.target.checked} : x))} />
        <div className="grid gap-2 sm:grid-cols-2">
          <input aria-label="Name" value={p.name} onChange={e => setPlayers(old => old.map((x,j) => j===i?{...x,name:e.target.value}:x))}
            className="rounded-lg border px-2 py-1 text-sm" />
          <input aria-label="E-Mail optional" type="email" value={p.email} onChange={e => setPlayers(old => old.map((x,j) => j===i?{...x,email:e.target.value}:x))}
            className="rounded-lg border px-2 py-1 text-sm" placeholder="E-Mail optional" />
        </div>
      </div>)}
      <input type="hidden" name="roster" value={selected.map(p => p.name.trim() + ";" + p.email.trim()).join("\n")} />
      <button type="submit" disabled={!selected.length || busy} className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">
        {selected.length} Spieler übernehmen
      </button>
      <p className="text-xs text-slate-500">Duplikate werden serverseitig übersprungen. Bestehende Spieler werden nicht überschrieben.</p>
    </form>}
  </div>;
}
