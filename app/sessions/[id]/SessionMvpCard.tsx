"use client";

import { useEffect, useMemo, useState } from "react";

type Participant = {
  id: number;
  name: string;
};

type ResultEntry = {
  playerId: number;
  name: string;
  votes: number;
};

type MvpState = {
  sessionId: number;
  hasResult: boolean;
  votingOpen: boolean;
  revealLabel: string;
  canVote: boolean;
  userHasVoted: boolean;
  userVotePlayerId: number | null;
  participants: Participant[];
  results: {
    winners: ResultEntry[];
    leaderboard: ResultEntry[];
    totalVotes: number;
  } | null;
};

type SessionMvpCardProps = {
  sessionId: number;
};

type LoadState = "idle" | "loading" | "ready" | "error";

function ResultPill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
      {text}
    </span>
  );
}

export default function SessionMvpCard({ sessionId }: SessionMvpCardProps) {
  const [state, setState] = useState<MvpState | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [forceOpen, setForceOpen] = useState(false);

  async function loadMvpState(force = forceOpen) {
    try {
      setLoadState("loading");
      setErr(null);

      const suffix = force ? "?forceOpen=1" : "";
      const response = await fetch(`/api/sessions/${sessionId}/mvp${suffix}`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "MVP-Daten konnten nicht geladen werden.");
      }

      setState(payload);
      setSelectedPlayerId(payload.userVotePlayerId ?? null);
      setLoadState("ready");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "MVP-Daten konnten nicht geladen werden.";
      setErr(message);
      setLoadState("error");
    }
  }

  useEffect(() => {
    loadMvpState(forceOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, forceOpen]);

  const selectedPlayerName = useMemo(() => {
    if (!state || !selectedPlayerId) return null;
    return state.participants.find((player) => player.id === selectedPlayerId)?.name ?? null;
  }, [state, selectedPlayerId]);

  async function handleVoteSubmit() {
    if (!selectedPlayerId || saving) return;

    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      const suffix = forceOpen ? "?forceOpen=1" : "";
      const response = await fetch(`/api/sessions/${sessionId}/mvp${suffix}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          votedPlayerId: selectedPlayerId,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "MVP-Stimme konnte nicht gespeichert werden.");
      }

      setMsg(`Deine Stimme wurde gezählt. Ergebnis ab ${payload.revealLabel}`);
      await loadMvpState(forceOpen);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "MVP-Stimme konnte nicht gespeichert werden.";
      setErr(message);
    } finally {
      setSaving(false);
    }
  }

  if (loadState === "loading" || loadState === "idle") {
    return (
      <section className="rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-amber-700">⭐ MVP Voting</div>
        <div className="mt-2 text-sm text-slate-600">Lade MVP-Bereich…</div>
      </section>
    );
  }

  if (loadState === "error" || !state) {
    return (
      <section className="rounded-[24px] border border-red-200 bg-red-50 p-4 shadow-sm">
        <div className="text-sm font-semibold text-red-700">MVP Voting</div>
        <div className="mt-2 text-sm text-red-700">
          {err ?? "MVP-Bereich konnte nicht geladen werden."}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadMvpState(forceOpen)}
            className="inline-flex items-center justify-center rounded-2xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            Erneut laden
          </button>

          <button
            type="button"
            onClick={() => setForceOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {forceOpen ? "Testmodus aus" : "Für Test öffnen"}
          </button>
        </div>
      </section>
    );
  }

  const votingOpen = state.votingOpen;

  return (
    <section className="rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-amber-700">⭐ MVP Voting</div>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-950">
            Spieler des Trainings wählen
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Alle anwesenden Teilnehmer können hier direkt ihren MVP wählen.
          </p>
        </div>

        <ResultPill
          text={votingOpen ? `Offen bis ${state.revealLabel}` : "Voting beendet"}
        />
      </div>

      {err ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {msg ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {msg}
        </div>
      ) : null}

      {!votingOpen ? (
        <div className="mt-4 space-y-4">
          {state.results?.winners && state.results.winners.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-white px-4 py-4">
              <div className="text-sm font-semibold text-amber-700">🏆 MVP</div>
              <div className="mt-1 text-lg font-extrabold text-slate-950">
                {state.results.winners.length === 1
                  ? state.results.winners[0].name
                  : state.results.winners.map((winner) => winner.name).join(", ")}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {state.results.winners.length === 1
                  ? `${state.results.winners[0].votes} Stimmen`
                  : `Gleichstand mit je ${state.results.winners[0].votes} Stimmen`}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
              Noch keine Stimmen abgegeben.
            </div>
          )}

          {state.results?.leaderboard && state.results.leaderboard.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="text-sm font-semibold text-slate-900">
                Voting-Ergebnis
              </div>

              <div className="mt-3 space-y-2">
                {state.results.leaderboard.map((entry, index) => (
                  <div
                    key={entry.playerId}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                        {index + 1}
                      </div>
                      <div className="text-sm font-semibold text-slate-900">
                        {entry.name}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-slate-600">
                      {entry.votes} {entry.votes === 1 ? "Stimme" : "Stimmen"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setForceOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Für Test öffnen
            </button>
          </div>
        </div>
      ) : state.canVote ? (
        state.userHasVoted ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-white px-4 py-4">
            <div className="text-sm font-semibold text-emerald-800">
              Deine Stimme wurde gezählt
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {selectedPlayerName
                ? `Aktuell gewählt: ${selectedPlayerName}.`
                : "Du hast bereits abgestimmt."}{" "}
              Du kannst deine Stimme bis {state.revealLabel} noch ändern.
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {state.participants.map((player) => {
                const active = selectedPlayerId === player.id;

                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setSelectedPlayerId(player.id)}
                    className={[
                      "rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                      active
                        ? "border-amber-400 bg-amber-100 text-amber-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {player.name}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleVoteSubmit}
                disabled={!selectedPlayerId || saving}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Speichere…" : "Stimme ändern"}
              </button>

              {forceOpen ? (
                <button
                  type="button"
                  onClick={() => setForceOpen(false)}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Testmodus beenden
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">
              Wer war heute euer Spieler des Trainings?
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {state.participants.map((player) => {
                const active = selectedPlayerId === player.id;

                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setSelectedPlayerId(player.id)}
                    className={[
                      "rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                      active
                        ? "border-amber-400 bg-amber-100 text-amber-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {player.name}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleVoteSubmit}
                disabled={!selectedPlayerId || saving}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Speichere…" : "Stimme abgeben"}
              </button>

              <div className="text-xs text-slate-500">
                Offen bis {state.revealLabel}
              </div>

              {forceOpen ? (
                <button
                  type="button"
                  onClick={() => setForceOpen(false)}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Testmodus beenden
                </button>
              ) : null}
            </div>
          </div>
        )
      ) : (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
          Abstimmen können nur anwesende Teilnehmer mit verknüpftem Spielerprofil.
        </div>
      )}
    </section>
  );
}