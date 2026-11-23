"use client";

import { useMemo, useState } from "react";
import LandingPageTracker from "@/components/analytics/LandingPageTracker";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, RotateCcw, Shuffle, Trophy, Users } from "lucide-react";

type Player = {
  id: number;
  name: string;
  strength: number;
  position: "Tor" | "Abwehr" | "Angriff";
  games: number;
  wins: number;
};

type Side = "A" | "B";
type Stage = "attendance" | "teams" | "result" | "table";

const DEMO_PLAYERS: Player[] = [
  { id: 1, name: "Andi", strength: 4, position: "Tor", games: 10, wins: 6 },
  { id: 2, name: "Bernd", strength: 3, position: "Abwehr", games: 11, wins: 5 },
  { id: 3, name: "Chris", strength: 4, position: "Angriff", games: 9, wins: 6 },
  { id: 4, name: "Dieter", strength: 2, position: "Abwehr", games: 8, wins: 3 },
  { id: 5, name: "Frank", strength: 5, position: "Angriff", games: 11, wins: 7 },
  { id: 6, name: "Günther", strength: 3, position: "Tor", games: 10, wins: 5 },
  { id: 7, name: "Hans", strength: 4, position: "Abwehr", games: 12, wins: 8 },
  { id: 8, name: "Jürgen", strength: 2, position: "Angriff", games: 8, wins: 4 },
  { id: 9, name: "Klaus", strength: 4, position: "Angriff", games: 10, wins: 6 },
  { id: 10, name: "Martin", strength: 3, position: "Abwehr", games: 9, wins: 4 },
  { id: 11, name: "Peter", strength: 3, position: "Angriff", games: 10, wins: 5 },
  { id: 12, name: "Ralf", strength: 4, position: "Abwehr", games: 8, wins: 4 },
];

function makeTeams(selectedIds: number[], shuffleRun: number): { A: Player[]; B: Player[] } {
  const selected = DEMO_PLAYERS.filter(player => selectedIds.includes(player.id));
  const result: { A: Player[]; B: Player[] } = { A: [], B: [] };
  const maxA = Math.ceil(selected.length / 2);
  const maxB = Math.floor(selected.length / 2);
  const keepers = selected.filter(player => player.position === "Tor");
  if (keepers[0]) result.A.push(keepers[0]);
  if (keepers[1]) result.B.push(keepers[1]);

  const fieldPlayers = selected.filter(player => !keepers.slice(0, 2).some(k => k.id === player.id))
    .sort((a, b) =>
      b.strength - a.strength ||
      ((a.id * 7 + shuffleRun * 13) % 17) - ((b.id * 7 + shuffleRun * 13) % 17)
    );

  for (const player of fieldPlayers) {
    const canA = result.A.length < maxA;
    const canB = result.B.length < maxB;
    if (!canA) { result.B.push(player); continue; }
    if (!canB) { result.A.push(player); continue; }

    const sumA = result.A.reduce((n, item) => n + item.strength, 0);
    const sumB = result.B.reduce((n, item) => n + item.strength, 0);
    // Prefer the weaker team, and balance headcount when scores are close.
    const scoreA = sumA + result.A.length * 0.4;
    const scoreB = sumB + result.B.length * 0.4;
    if (Math.abs(scoreA - scoreB) < 0.1) {
      (result.A.length <= result.B.length ? result.A : result.B).push(player);
    } else {
      (scoreA < scoreB ? result.A : result.B).push(player);
    }
  }
  return result;
}

function playerPoints(player: Player) {
  return player.wins * 3;
}

export default function RonaldDemo() {
  const [stage, setStage] = useState<Stage>("attendance");
  const [present, setPresent] = useState<number[]>(DEMO_PLAYERS.slice(0, 10).map(player => player.id));
  const [shuffleRun, setShuffleRun] = useState(0);
  const [scoreA, setScoreA] = useState("6");
  const [scoreB, setScoreB] = useState("4");
  const [finished, setFinished] = useState(false);
  const teams = useMemo(() => makeTeams(present, shuffleRun), [present, shuffleRun]);

  const teamAIds = useMemo(() => new Set(teams.A.map(player => player.id)), [teams.A]);
  const teamBIds = useMemo(() => new Set(teams.B.map(player => player.id)), [teams.B]);
  const a = Number(scoreA);
  const b = Number(scoreB);
  const validScore = Number.isInteger(a) && Number.isInteger(b) &&
    a >= 0 && b >= 0 && a <= 40 && b <= 40 && scoreA !== "" && scoreB !== "";

  const standings = useMemo(() => DEMO_PLAYERS.map(player => {
    const participated = finished && (teamAIds.has(player.id) || teamBIds.has(player.id));
    const won = finished && (
      (teamAIds.has(player.id) && a > b) ||
      (teamBIds.has(player.id) && b > a)
    );
    return {
      ...player,
      gamesNow: player.games + (participated ? 1 : 0),
      winsNow: player.wins + (won ? 1 : 0),
      pointsNow: playerPoints(player) + (won ? 3 : 0),
      playedToday: participated,
    };
  }).sort((x, y) => y.pointsNow - x.pointsNow || y.winsNow - x.winsNow || x.name.localeCompare(y.name, "de")),
    [finished, a, b, teamAIds, teamBIds]);

  const nextFromTeams = () => { setScoreA("6"); setScoreB("4"); setStage("result"); };
  const reset = () => {
    setStage("attendance");
    setPresent(DEMO_PLAYERS.slice(0, 10).map(player => player.id));
    setShuffleRun(0);
    setScoreA("6");
    setScoreB("4");
    setFinished(false);
  };
  const stages: Array<{ id: Stage; label: string }> = [
    { id: "attendance", label: "Teilnehmer" },
    { id: "teams", label: "Teams" },
    { id: "result", label: "Endstand" },
    { id: "table", label: "Tabelle" },
  ];
  const reachedIndex = stages.findIndex(item => item.id === stage);
  const button = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-6 text-slate-950 sm:pt-10">
      <LandingPageTracker />
      <div className="mx-auto max-w-3xl">
        <header className="relative overflow-hidden rounded-[28px] bg-slate-950 px-6 pb-7 pt-6 text-white sm:px-8 sm:pt-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="relative">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="text-2xl font-black tracking-tight">strikr<span className="text-emerald-400">.</span></div>
              <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold">Persönliche Demo · DJK AH</div>
            </div>
            <h1 className="max-w-xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              Hi Ronald! So wird aus eurem Donnerstag eine kleine eigene Liga. ⚽
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Kein Schriftführer. Keine einzelnen Tore oder Torschützen erfassen.
              Nur die Teilnehmer und am Ende ein Ergebnis – den Rest erledigt strikr.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">Keine Anmeldung</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">Keine echten Vereinsdaten</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">Nichts wird gespeichert</span>
            </div>
          </div>
        </header>

        <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Demo-Schritte">
          {stages.map((item, index) => (
            <div key={item.id} className={"rounded-xl px-1 py-3 text-center text-xs font-bold sm:text-sm " +
              (item.id === stage ? "bg-emerald-100 text-emerald-900" : index < reachedIndex ? "text-emerald-700" : "text-slate-400")}>
              <span className="block text-base">{index < reachedIndex ? "✓" : index + 1}</span>
              {item.label}
            </div>
          ))}
        </div>

        <section className="mt-4 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {stage === "attendance" && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Schritt 1 · Anwesenheit</p>
              <h2 className="mt-2 text-2xl font-black">Wer kickt heute mit?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                In der richtigen App können eure Spieler selbst zu- oder absagen – ähnlich wie bei SpielerPlus.
                Die Liste ist dann schon fertig. Hier kannst du testweise ein paar Spieler abwählen.
              </p>
              <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-emerald-700" />
                  <div><div className="text-xl font-black">{present.length} Zusagen</div><p className="text-xs text-emerald-800">Beispiel für euer Donnerstagstraining</p></div>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {DEMO_PLAYERS.map(player => (
                  <label key={player.id} className={"flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition " +
                    (present.includes(player.id) ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white")}>
                    <span className="flex items-center gap-3">
                      <input type="checkbox" checked={present.includes(player.id)}
                        onChange={() => setPresent(old => old.includes(player.id)
                          ? old.filter(id => id !== player.id) : [...old, player.id])}
                        className="h-5 w-5 accent-emerald-700" />
                      <span className="font-semibold">{player.name}</span>
                    </span>
                    <span className="text-xs text-slate-400">{player.position}</span>
                  </label>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">Alle Namen sind erfunden. Keine Registrierung notwendig.</p>
                <button type="button" data-analytics-event="private_demo_teams_click" disabled={present.length < 4} onClick={() => {setFinished(false); setStage("teams");}} className={button}>
                  Faire Teams erstellen <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              {present.length < 4 && <p className="mt-2 text-xs text-amber-700">Bitte mindestens vier Spieler auswählen.</p>}
            </div>
          )}

          {stage === "teams" && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Schritt 2 · Mannschaften</p>
              <h2 className="mt-2 text-2xl font-black">Zwei Teams. Ein Klick.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">strikr verteilt die Beispielspieler nach Stärke und Position. Du musst keine Namen auf Zettel schreiben.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {(["A", "B"] as const).map(side => {
                  const players = teams[side];
                  const sum = players.reduce((n, player) => n + player.strength, 0);
                  return (
                    <div key={side} className={"rounded-2xl p-4 " + (side === "A" ? "bg-slate-950 text-white" : "bg-emerald-900 text-white")}>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xl font-black">Team {side}</h3>
                        <span className="text-xs text-white/70">{players.length} Spieler · {sum} Stärkepunkte</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {players.map(player => (
                          <div key={player.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
                            <span className="font-semibold">{player.name}</span>
                            <span className="text-xs text-white/60">{player.position}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => setShuffleRun(r => r + 1)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold">
                  <Shuffle className="h-4 w-4" /> Neu verteilen
                </button>
                <span className="text-xs text-slate-500">Bei Bedarf kannst du die Teams neu mischen.</span>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => setStage("attendance")}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft className="h-4 w-4" /> Zurück</button>
                <button type="button" data-analytics-event="private_demo_result_click" onClick={nextFromTeams} className={button}>
                  Training gespielt – Endstand eintragen <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {stage === "result" && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Schritt 3 · Nach dem Training</p>
              <h2 className="mt-2 text-2xl font-black">Nur noch das Endergebnis.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Ihr spielt ganz normal. Niemand muss Tore zählen oder mitschreiben.
                Am Ende trägst du nur den Endstand ein – fertig.
              </p>
              <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl bg-slate-50 p-5 sm:gap-6">
                <label className="min-w-0 text-center">
                  <span className="block text-sm font-bold">Team A</span>
                  <input type="number" min="0" max="40" step="1" inputMode="numeric" value={scoreA}
                    onChange={event => setScoreA(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-2 py-4 text-center text-4xl font-black" />
                </label>
                <span className="mt-7 text-2xl font-bold text-slate-300">:</span>
                <label className="min-w-0 text-center">
                  <span className="block text-sm font-bold">Team B</span>
                  <input type="number" min="0" max="40" step="1" inputMode="numeric" value={scoreB}
                    onChange={event => setScoreB(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-2 py-4 text-center text-4xl font-black" />
                </label>
              </div>
              <div className="mt-4 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <p>Alle Einsätze und Siege werden automatisch den Spielern aus Team A und Team B zugeordnet. Keine einzelnen Torschützen nötig.</p>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => setStage("teams")}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft className="h-4 w-4" /> Zurück</button>
                <button type="button" data-analytics-event="private_demo_completed" disabled={!validScore} onClick={() => {setFinished(true);setStage("table");}} className={button}>
                  Ergebnis speichern – Tabelle ansehen <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              {!validScore && <p className="mt-2 text-xs text-amber-700">Bitte einen gültigen Endstand zwischen 0 und 40 eintragen.</p>}
            </div>
          )}

          {stage === "table" && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Schritt 4 · Automatisch berechnet</p>
              <div className="mt-2 flex items-center gap-3">
                <Trophy className="h-8 w-8 text-amber-500" />
                <h2 className="text-2xl font-black">Eure eigene Donnerstags-Liga.</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Das Ergebnis {a}:{b} ist eingetragen. Alle Teilnehmer bekommen einen Einsatz gutgeschrieben,
                die Gewinner zusätzlich drei Punkte. Und so entstehen ohne Schriftführer eigene Geschichten.
              </p>
              <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[360px] text-left text-sm">
                  <thead className="bg-slate-950 text-white">
                    <tr><th scope="col" className="px-3 py-3">#</th><th scope="col" className="px-3 py-3">Spieler</th>
                      <th scope="col" className="px-2 py-3 text-center">Einsätze</th>
                      <th scope="col" className="px-2 py-3 text-center">Siege</th>
                      <th scope="col" className="px-3 py-3 text-right">Punkte</th></tr>
                  </thead>
                  <tbody>
                    {standings.map((player, index) => (
                      <tr key={player.id} className={"border-t border-slate-100 " + (player.playedToday ? "bg-emerald-50/50" : "")}>
                        <td className="px-3 py-3 font-extrabold">{index + 1}.</td>
                        <td className="px-3 py-3 font-semibold">{player.name} {player.playedToday && <span title="Heute dabei" className="text-emerald-700">✓</span>}</td>
                        <td className="px-2 py-3 text-center">{player.gamesNow}</td>
                        <td className="px-2 py-3 text-center">{player.winsNow}</td>
                        <td className="px-3 py-3 text-right font-black">{player.pointsNow}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Fiktive Vorjahres-/Saisonwerte für diese Demo. Die grün markierten Spieler haben gerade einen
                Einsatz bekommen. Bei Unentschieden gibt es in dieser vereinfachten Demo keine Siegpunkte.
              </p>
              <div className="mt-6 rounded-2xl bg-amber-50 p-5">
                <div className="flex items-center gap-2 text-base font-black text-amber-950">
                  <CircleHelp className="h-5 w-5" /> Und was macht der Organisator?
                </div>
                <p className="mt-2 text-sm leading-6 text-amber-950">
                  Praktisch nur das Endergebnis eintragen. Alle anderen Funktionen kannst du nutzen –
                  musst du aber nicht. Eure Leibchen- und Getränkeliste darf einfach weiterlaufen.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={reset}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <RotateCcw className="h-4 w-4" /> Demo nochmal ausprobieren
                </button>
                <a href="mailto:marcus.bofinger@gmail.com?subject=strikr%20Demo%20DJK%20AH"
                  className={button}>
                  Fragen? Einfach antworten <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
        </section>

        <footer className="mt-5 flex items-center justify-between gap-3 px-1 text-xs text-slate-500">
          <span>Persönliche Vorschau · Ohne Anmeldung · Ohne Speicherung</span>
          <span className="font-black text-slate-800">strikr.team</span>
        </footer>
      </div>
    </main>
  );
}
