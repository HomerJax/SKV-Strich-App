"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Award,
  CalendarDays,
  ChartColumn,
  Check,
  Home,
  LockKeyhole,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import AchievementBadgeVisual from "@/components/badges/AchievementBadgeVisual";
import {
  DEFAULT_PRESENT_IDS,
  DEMO_BADGES,
  DEMO_CLUB,
  DEMO_PLAYERS,
  DEMO_RECENT_SESSIONS,
  DEMO_STANDINGS,
  getDemoPlayer,
  type DemoPlayer,
} from "@/lib/demo/data";

type DemoView = "home" | "training" | "standings" | "stats" | "badges";
type TeamSide = "A" | "B";
type TeamMap = Record<number, TeamSide>;

type DemoAppProps = {
  logoUrl: string;
};

const NAV_ITEMS: Array<{
  key: DemoView;
  label: string;
  icon: typeof Home;
}> = [
  { key: "home", label: "Home", icon: Home },
  { key: "training", label: "Training", icon: Users },
  { key: "standings", label: "Tabelle", icon: Trophy },
  { key: "stats", label: "Stats", icon: ChartColumn },
  { key: "badges", label: "Badges", icon: Award },
];

function positionLabel(position: DemoPlayer["position"]) {
  if (position === "goalkeeper") return "Torwart";
  if (position === "defense") return "Hinten";
  return "Vorne";
}

function playerScore(player: DemoPlayer) {
  return player.strength + (player.category === "Ü32" ? 5 : 0);
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function teamPositionPenalty(a: DemoPlayer[], b: DemoPlayer[]) {
  const count = (team: DemoPlayer[], position: DemoPlayer["position"]) =>
    team.filter((player) => player.position === position).length;

  return (
    Math.abs(count(a, "goalkeeper") - count(b, "goalkeeper")) * 5 +
    Math.abs(count(a, "defense") - count(b, "defense")) * 2 +
    Math.abs(count(a, "attack") - count(b, "attack")) * 2
  );
}

function balanceGroupPenalty(a: DemoPlayer[], b: DemoPlayer[]) {
  const groups = new Set(
    [...a, ...b]
      .map((player) => player.balanceGroup)
      .filter((group): group is string => Boolean(group))
  );

  let penalty = 0;
  for (const group of groups) {
    const countA = a.filter((player) => player.balanceGroup === group).length;
    const countB = b.filter((player) => player.balanceGroup === group).length;
    penalty += Math.abs(countA - countB);
  }
  return penalty;
}

function buildBalancedTeams(players: DemoPlayer[]) {
  const targetA = Math.ceil(players.length / 2);
  const targetB = Math.floor(players.length / 2);
  const keepers = players.filter((player) => player.position === "goalkeeper");
  const field = players.filter((player) => player.position !== "goalkeeper");

  let bestA: DemoPlayer[] = [];
  let bestB: DemoPlayer[] = [];
  let bestQuality: [number, number, number] | null = null;

  const compare = (left: [number, number, number], right: [number, number, number]) => {
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) return left[index] - right[index];
    }
    return 0;
  };

  for (let attempt = 0; attempt < 1600; attempt += 1) {
    const a: DemoPlayer[] = [];
    const b: DemoPlayer[] = [];

    for (const keeper of shuffle(keepers)) {
      if (a.length >= targetA) b.push(keeper);
      else if (b.length >= targetB) a.push(keeper);
      else if (a.filter((p) => p.position === "goalkeeper").length <= b.filter((p) => p.position === "goalkeeper").length) a.push(keeper);
      else b.push(keeper);
    }

    const mixedField = shuffle(field);
    const remainingA = targetA - a.length;
    a.push(...mixedField.slice(0, remainingA));
    b.push(...mixedField.slice(remainingA));

    if (a.length !== targetA || b.length !== targetB) continue;

    const strengthDiff = Math.abs(
      a.reduce((sum, player) => sum + playerScore(player), 0) -
        b.reduce((sum, player) => sum + playerScore(player), 0)
    );
    const quality: [number, number, number] = [
      strengthDiff,
      balanceGroupPenalty(a, b),
      teamPositionPenalty(a, b),
    ];

    if (!bestQuality || compare(quality, bestQuality) < 0) {
      bestA = a;
      bestB = b;
      bestQuality = quality;
    }
  }

  const map: TeamMap = {};
  bestA.forEach((player) => {
    map[player.id] = "A";
  });
  bestB.forEach((player) => {
    map[player.id] = "B";
  });
  return map;
}

function DemoPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-amber-900">
      <Sparkles className="h-3 w-3" />
      Demo
    </span>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-black tracking-tight text-zinc-950">{value}</div>
      <div className="mt-1 text-xs leading-5 text-zinc-500">{hint}</div>
    </div>
  );
}

function HomeView({ onOpenTraining }: { onOpenTraining: () => void }) {
  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] bg-black p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <DemoPill />
          <span className="text-xs font-semibold text-white/50">Donnerstag · 19:00 Uhr</span>
        </div>
        <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Training ist vorbereitet.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
          Anwesenheit auswählen, faire Teams generieren und direkt sehen, wie strikr den Trainingsabend organisiert.
        </p>
        <button
          type="button"
          onClick={onOpenTraining}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-black transition hover:bg-zinc-100"
        >
          Training ausprobieren
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Kader" value={`${DEMO_PLAYERS.length}`} hint="Spieler in dieser Demo" />
        <MetricCard label="Aktuelle Serie" value="3 Siege" hint="Form wird automatisch sichtbar" />
        <MetricCard label="Nächstes Training" value="Donnerstag" hint="19:00 Uhr · Demo-Session" />
      </div>

      <section className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Letzte Trainings</div>
            <h2 className="mt-1 text-xl font-black text-zinc-950">Was zuletzt passiert ist</h2>
          </div>
          <CalendarDays className="h-6 w-6 text-zinc-400" />
        </div>
        <div className="mt-4 divide-y divide-zinc-100">
          {DEMO_RECENT_SESSIONS.map((session) => (
            <div key={session.date} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div>
                <div className="font-bold text-zinc-900">{session.label}</div>
                <div className="mt-0.5 text-xs text-zinc-500">{session.date} · {session.participants} Teilnehmer</div>
              </div>
              <div className="rounded-xl bg-zinc-950 px-3 py-1.5 text-sm font-black text-white">{session.score}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TrainingView({
  presentIds,
  setPresentIds,
  teams,
  setTeams,
}: {
  presentIds: number[];
  setPresentIds: (ids: number[]) => void;
  teams: TeamMap | null;
  setTeams: (teams: TeamMap | null) => void;
}) {
  const [goalsA, setGoalsA] = useState("7");
  const [goalsB, setGoalsB] = useState("5");
  const [savedResult, setSavedResult] = useState<string | null>(null);

  const presentPlayers = DEMO_PLAYERS.filter((player) => presentIds.includes(player.id));
  const teamA = teams ? presentPlayers.filter((player) => teams[player.id] === "A") : [];
  const teamB = teams ? presentPlayers.filter((player) => teams[player.id] === "B") : [];

  function togglePresence(playerId: number) {
    const next = presentIds.includes(playerId)
      ? presentIds.filter((id) => id !== playerId)
      : [...presentIds, playerId];
    setPresentIds(next);
    setTeams(null);
    setSavedResult(null);
  }

  function generate() {
    if (presentPlayers.length < 2) return;
    setTeams(buildBalancedTeams(presentPlayers));
    setSavedResult(null);
  }

  function reset() {
    setPresentIds(DEFAULT_PRESENT_IDS);
    setTeams(null);
    setGoalsA("7");
    setGoalsB("5");
    setSavedResult(null);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><DemoPill /><span className="text-xs font-semibold text-zinc-500">lokal in deinem Browser</span></div>
            <h1 className="mt-3 text-2xl font-black text-zinc-950">Donnerstagstraining</h1>
            <p className="mt-1 text-sm text-zinc-600">Klick Spieler an und generiere deine eigenen Teams. Andere Demo-Besucher sehen davon nichts.</p>
          </div>
          <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50">
            <RotateCcw className="h-3.5 w-3.5" /> Zurücksetzen
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-zinc-950 px-4 py-3 text-white">
          <div><div className="text-xs text-white/50">Anwesend</div><div className="text-xl font-black">{presentIds.length}</div></div>
          <div className="text-right"><div className="text-xs text-white/50">Teamgröße</div><div className="text-xl font-black">{Math.ceil(presentIds.length / 2)} : {Math.floor(presentIds.length / 2)}</div></div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_PLAYERS.map((player) => {
            const active = presentIds.includes(player.id);
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => togglePresence(player.id)}
                className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                  active ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{player.name}</div>
                  <div className={`mt-0.5 text-[11px] ${active ? "text-white/55" : "text-zinc-500"}`}>{player.category} · {positionLabel(player.position)} · Stärke {player.strength}</div>
                </div>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${active ? "border-white/30 bg-white text-black" : "border-zinc-300"}`}>
                  {active ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={presentPlayers.length < 2}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          <Shuffle className="h-4 w-4" /> Faire Teams generieren
        </button>
      </section>

      {teams ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {(["A", "B"] as const).map((side) => {
            const team = side === "A" ? teamA : teamB;
            const total = team.reduce((sum, player) => sum + playerScore(player), 0);
            return (
              <div key={side} className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black text-zinc-950">Team {side}</h2>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">Balance {total}</span>
                </div>
                <div className="mt-4 space-y-2">
                  {team.map((player) => (
                    <div key={player.id} className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2.5">
                      <div className="font-semibold text-zinc-900">{player.name}</div>
                      <div className="text-xs text-zinc-500">{positionLabel(player.position)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      {teams ? (
        <section className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><Trophy className="h-5 w-5" /><h2 className="text-xl font-black text-zinc-950">Ergebnis ausprobieren</h2></div>
          <p className="mt-1 text-sm text-zinc-600">Auch das bleibt nur in deiner Demo.</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-xs font-bold text-zinc-600">Team A<input value={goalsA} onChange={(event) => setGoalsA(event.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" className="mt-1 block w-20 rounded-xl border border-zinc-300 px-3 py-2 text-center text-xl font-black" /></label>
            <div className="pb-2 text-xl font-black text-zinc-400">:</div>
            <label className="text-xs font-bold text-zinc-600">Team B<input value={goalsB} onChange={(event) => setGoalsB(event.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" className="mt-1 block w-20 rounded-xl border border-zinc-300 px-3 py-2 text-center text-xl font-black" /></label>
            <button type="button" onClick={() => setSavedResult(`${goalsA || "0"}:${goalsB || "0"}`)} className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800">Demo-Ergebnis speichern</button>
          </div>
          {savedResult ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">✓ Ergebnis {savedResult} ist in dieser Demo gesetzt – ohne Datenbank-Write.</div> : null}
        </section>
      ) : null}
    </div>
  );
}

function StandingsView() {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div><div className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Saison 2026</div><h1 className="mt-1 text-2xl font-black text-zinc-950">Tabelle</h1></div>
        <Trophy className="h-7 w-7 text-zinc-400" />
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead><tr className="border-b border-zinc-200 text-left text-[11px] font-bold uppercase tracking-wide text-zinc-500"><th className="py-3 pr-3">#</th><th className="py-3 pr-3">Spieler</th><th className="py-3 pr-3 text-right">Teilnahmen</th><th className="py-3 pr-3 text-right">Siege</th><th className="py-3 pr-3 text-right">Siegquote</th><th className="py-3 text-right">Punkte</th></tr></thead>
          <tbody>
            {DEMO_STANDINGS.map((row, index) => {
              const player = getDemoPlayer(row.playerId);
              if (!player) return null;
              const quote = row.appearances ? Math.round((row.wins / row.appearances) * 100) : 0;
              return <tr key={row.playerId} className="border-b border-zinc-100 last:border-0"><td className="py-3 pr-3 font-black text-zinc-500">{index + 1}</td><td className="py-3 pr-3 font-bold text-zinc-950">{player.name}</td><td className="py-3 pr-3 text-right text-zinc-600">{row.appearances}</td><td className="py-3 pr-3 text-right font-semibold text-zinc-800">{row.wins}</td><td className="py-3 pr-3 text-right text-zinc-600">{quote}%</td><td className="py-3 text-right font-black text-zinc-950">{row.points}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatsView() {
  const [playerId, setPlayerId] = useState(DEMO_STANDINGS[0]?.playerId ?? DEMO_PLAYERS[0].id);
  const standing = DEMO_STANDINGS.find((row) => row.playerId === playerId) ?? DEMO_STANDINGS[0];
  const player = getDemoPlayer(playerId) ?? DEMO_PLAYERS[0];
  const winRate = standing?.appearances ? Math.round((standing.wins / standing.appearances) * 100) : 0;

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><div className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Persönliche Stats</div><h1 className="mt-1 text-2xl font-black text-zinc-950">Spieler vergleichen</h1></div>
          <label className="text-xs font-bold text-zinc-600">Demo-Spieler<select value={playerId} onChange={(event) => setPlayerId(Number(event.target.value))} className="mt-1 block min-w-52 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900">{DEMO_STANDINGS.map((row) => { const optionPlayer = getDemoPlayer(row.playerId); return optionPlayer ? <option key={row.playerId} value={row.playerId}>{optionPlayer.name}</option> : null; })}</select></label>
        </div>
        <div className="mt-5 rounded-2xl bg-zinc-950 p-5 text-white">
          <div className="text-xs font-bold uppercase tracking-wide text-white/45">{player.category} · {positionLabel(player.position)}</div>
          <div className="mt-1 text-2xl font-black">{player.name}</div>
          <div className="mt-1 text-sm text-white/60">Stärke {player.strength} · aktuelle Serie {standing?.streak ?? 1}</div>
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-4">
        <MetricCard label="Teilnahmen" value={String(standing?.appearances ?? 0)} hint="Saison 2026" />
        <MetricCard label="Siege" value={String(standing?.wins ?? 0)} hint="gewonnene Trainings" />
        <MetricCard label="Siegquote" value={`${winRate}%`} hint="Siege / Teilnahmen" />
        <MetricCard label="Punkte" value={String(standing?.points ?? 0)} hint="für die Tabelle" />
      </div>
      <section className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-zinc-500" /><h2 className="font-black text-zinc-950">Form</h2></div>
        <div className="mt-4 flex gap-2">{["S", "S", "N", "S", "S"].map((result, index) => <span key={`${result}-${index}`} className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${result === "S" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{result}</span>)}</div>
      </section>
    </div>
  );
}

function BadgesView() {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div><div className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Hall of Fame</div><h1 className="mt-1 text-2xl font-black text-zinc-950">Badges & Auszeichnungen</h1><p className="mt-1 text-sm text-zinc-600">Ein paar Badges sind in der Demo schon freigeschaltet. Die großen Karriere-Stufen warten noch.</p></div>
        <Award className="h-7 w-7 text-zinc-400" />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DEMO_BADGES.map((badge) => (
          <div key={badge.key} className={`rounded-2xl border p-4 text-center ${badge.unlocked ? "border-zinc-200 bg-zinc-50" : "border-zinc-200 bg-white"}`}>
            <div className="mx-auto flex h-24 items-center justify-center">
              <AchievementBadgeVisual badgeKey={badge.key} size="xl" grayscale={!badge.unlocked} />
            </div>
            <div className="mt-2 font-black text-zinc-950">{badge.title}</div>
            <div className="mt-1 text-xs leading-5 text-zinc-500">{badge.description}</div>
            <div className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.unlocked ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-500"}`}>{badge.unlocked ? <Check className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}{badge.unlocked ? "Freigeschaltet" : "Noch gesperrt"}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DemoApp({ logoUrl }: DemoAppProps) {
  const [view, setView] = useState<DemoView>("home");
  const [presentIds, setPresentIdsState] = useState<number[]>(DEFAULT_PRESENT_IDS);
  const [teams, setTeamsState] = useState<TeamMap | null>(null);

  const selectedLabel = useMemo(() => NAV_ITEMS.find((item) => item.key === view)?.label ?? "Demo", [view]);

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-neutral-100 pb-24 text-zinc-950">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top)+3px)] z-30 border-b border-amber-200 bg-amber-50/95 backdrop-blur sm:top-[calc(4.5rem+env(safe-area-inset-top)+3px)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logoUrl} alt="1. FC Strikr 2026" className="h-9 w-9 shrink-0 rounded-xl border border-black/10 bg-white object-contain p-1" />
            <div className="min-w-0"><div className="flex items-center gap-2"><DemoPill /><span className="truncate text-sm font-black">{DEMO_CLUB.name}</span></div><div className="mt-0.5 truncate text-[11px] text-amber-900/70">{selectedLabel} · Änderungen werden nicht gespeichert</div></div>
          </div>
          <Link href="/signup?next=%2Fclub-setup" className="hidden shrink-0 items-center gap-1 rounded-full bg-black px-3 py-2 text-xs font-bold text-white hover:bg-zinc-800 sm:inline-flex">Eigenen Club erstellen <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
        {view === "home" ? <HomeView onOpenTraining={() => setView("training")} /> : null}
        {view === "training" ? <TrainingView presentIds={presentIds} setPresentIds={setPresentIdsState} teams={teams} setTeams={setTeamsState} /> : null}
        {view === "standings" ? <StandingsView /> : null}
        {view === "stats" ? <StatsView /> : null}
        {view === "badges" ? <BadgesView /> : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around px-1 sm:px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.key === view;
            return <button key={item.key} type="button" onClick={() => setView(item.key)} className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-bold transition sm:text-xs ${active ? "text-black" : "text-zinc-400 hover:text-zinc-700"}`}><span className={`flex h-8 w-10 items-center justify-center rounded-xl ${active ? "bg-black text-white" : "bg-transparent"}`}><Icon className="h-4 w-4" /></span><span className="truncate">{item.label}</span></button>;
          })}
        </div>
      </div>

      <Link href="/signup?next=%2Fclub-setup" className="fixed bottom-24 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-black px-4 py-3 text-xs font-extrabold text-white shadow-xl sm:hidden">Club starten <ArrowRight className="h-3.5 w-3.5" /></Link>
    </main>
  );
}
