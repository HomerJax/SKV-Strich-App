"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PlayerBadge, {
  getPlayerBadgeTier,
} from "@/components/badges/PlayerBadge";

type Participant = {
  id: number;
  name: string;
  mvpCount?: number | null;
};

type ResultEntry = {
  playerId: number;
  name: string;
  votes: number;
  mvpCount?: number | null;
};

type BadgeUpgrade = {
  playerId: number;
  playerName: string;
  previousMvpCount: number;
  newMvpCount: number;
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
  voteCount: number;
  eligibleVoterCount: number;
  votedByNames: string[];
  results: {
    winners: ResultEntry[];
    leaderboard: ResultEntry[];
    totalVotes: number;
    badgeUpgrade?: BadgeUpgrade | null;
  } | null;
};

type SessionMvpCardProps = {
  sessionId: number;
};

type LoadState = "idle" | "loading" | "ready" | "error";

function ResultPill({
  text,
  tone = "default",
}: {
  text: string;
  tone?: "default" | "success";
}) {
  const className =
    tone === "success"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-amber-100 text-amber-800";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {text}
    </span>
  );
}

function VoteCountPill({
  voteCount,
  eligibleVoterCount,
  votingOpen,
}: {
  voteCount: number;
  eligibleVoterCount: number;
  votingOpen: boolean;
}) {
  const text = votingOpen
    ? `${voteCount} von ${eligibleVoterCount} Stimmen`
    : `${voteCount} ${voteCount === 1 ? "Stimme" : "Stimmen"} gesamt`;

  return (
    <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-black/10">
      {text}
    </span>
  );
}

function safeMvpCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function MergedWinnerCard({
  winner,
  badgeUpgrade,
}: {
  winner: ResultEntry;
  badgeUpgrade: BadgeUpgrade | null;
}) {
  const winnerCount = safeMvpCount(winner.mvpCount);

  const rawPreviousCount =
    badgeUpgrade && badgeUpgrade.playerId === winner.playerId
      ? safeMvpCount(badgeUpgrade.previousMvpCount)
      : Math.max(winnerCount - 1, 0);

  const rawNextCount =
    badgeUpgrade && badgeUpgrade.playerId === winner.playerId
      ? safeMvpCount(badgeUpgrade.newMvpCount)
      : winnerCount;

  const previousCount = Math.max(rawPreviousCount, 0);
  const nextCount = badgeUpgrade
    ? Math.max(rawNextCount, previousCount + 1)
    : Math.max(rawNextCount, previousCount + 1);

  const previousTier = getPlayerBadgeTier(previousCount);
  const nextTier = getPlayerBadgeTier(nextCount);
  const tierChanged = previousTier?.key !== nextTier?.key;

  return (
    <div className="rounded-2xl border border-amber-200 bg-white px-4 py-4">
      <div className="text-sm font-semibold text-amber-700">🏆 MVP</div>

      <div className="mt-3 flex items-start gap-3">
        <PlayerBadge
          mvpCount={nextCount}
          size="md"
          hideIfNone
          iconOnly
          className="shrink-0"
        />

        <div className="min-w-0 flex-1">
          <div className="text-xl font-extrabold tracking-tight text-slate-950">
            {winner.name}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            {winner.votes} {winner.votes === 1 ? "Stimme" : "Stimmen"}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white px-4 py-4">
        <div className="text-sm font-semibold text-violet-700">
          ✨ Badge-Fortschritt
        </div>

        {tierChanged ? (
          <>
            <div className="mt-2 text-sm text-slate-600">
              Neues Badge freigeschaltet.
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="flex flex-col items-center gap-1">
                {previousCount > 0 ? (
                  <PlayerBadge mvpCount={previousCount} size="md" iconOnly />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-slate-200 bg-slate-100 text-[11px] font-semibold text-slate-400">
                    —
                  </div>
                )}
                <div className="text-[11px] font-medium text-slate-500">
                  {previousTier?.label ?? "Kein Badge"}
                </div>
              </div>

              <div className="text-lg font-bold text-slate-400">→</div>

              <div className="flex flex-col items-center gap-1">
                <PlayerBadge mvpCount={nextCount} size="md" iconOnly />
                <div className="text-[11px] font-semibold text-slate-700">
                  {nextTier?.label ?? "Badge"}
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              MVP gesamt: {previousCount} → {nextCount}
            </div>
          </>
        ) : (
          <>
            <div className="mt-2 text-sm text-slate-600">
              Fortschritt im aktuellen Badge.
            </div>

            <div className="mt-4 flex items-center gap-3">
              <PlayerBadge mvpCount={nextCount} size="md" iconOnly />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {nextTier?.label ?? "Badge"}
                </div>
                <div className="text-xs text-slate-500">
                  MVP gesamt: {previousCount} → {nextCount}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SessionMvpCard({ sessionId }: SessionMvpCardProps) {
  const router = useRouter();

  const [state, setState] = useState<MvpState | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  async function loadMvpState() {
    try {
      setLoadState("loading");
      setErr(null);

      const response = await fetch(`/api/sessions/${sessionId}/mvp`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error || "MVP-Daten konnten nicht geladen werden."
        );
      }

      setState(payload);
      setSelectedPlayerId(payload.userVotePlayerId ?? null);
      setLoadState("ready");

      if (payload.votingOpen && payload.userHasVoted) {
        setCollapsed(true);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "MVP-Daten konnten nicht geladen werden.";
      setErr(message);
      setLoadState("error");
    }
  }

  useEffect(() => {
    loadMvpState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const selectedPlayerName = useMemo(() => {
    if (!state || !selectedPlayerId) return null;
    return (
      state.participants.find((player) => player.id === selectedPlayerId)?.name ??
      null
    );
  }, [state, selectedPlayerId]);

  async function handleVoteSubmit() {
    if (!selectedPlayerId || saving) return;

    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      const response = await fetch(`/api/sessions/${sessionId}/mvp`, {
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
        throw new Error(
          payload?.error || "MVP-Stimme konnte nicht gespeichert werden."
        );
      }

      setMsg(`Deine Stimme wurde gezählt. Ergebnis ab ${payload.revealLabel}`);
      await loadMvpState();
      setCollapsed(true);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "MVP-Stimme konnte nicht gespeichert werden.";
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
            onClick={loadMvpState}
            className="inline-flex items-center justify-center rounded-2xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            Erneut laden
          </button>
        </div>
      </section>
    );
  }

  const votingOpen = state.votingOpen;
  const badgeUpgrade = state.results?.badgeUpgrade ?? null;
  const progressPercent =
    state.eligibleVoterCount > 0
      ? Math.max(
          0,
          Math.min(100, (state.voteCount / state.eligibleVoterCount) * 100)
        )
      : 0;

  const userDone = votingOpen && state.userHasVoted;
  const shellClassName = userDone
    ? "rounded-[24px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm"
    : "rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm";

  const titleColorClass = userDone ? "text-emerald-700" : "text-amber-700";
  const pillTone = userDone ? "success" : "default";

  const collapsedSummary = !votingOpen
    ? state.results?.winners && state.results.winners.length > 0
      ? `Ergebnis verfügbar${state.results.winners.length === 1 ? ` · MVP: ${state.results.winners[0].name}` : ""}`
      : "Voting beendet"
    : state.userHasVoted
      ? selectedPlayerName
        ? `Deine Stimme ist abgegeben · gewählt: ${selectedPlayerName}`
        : "Deine Stimme ist abgegeben"
      : `${state.voteCount} von ${state.eligibleVoterCount} haben abgestimmt`;

  if (collapsed) {
    return (
      <section className={shellClassName}>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className={`flex w-full items-center justify-between gap-4 rounded-[20px] text-left ${
            userDone ? "text-emerald-950" : "text-slate-950"
          }`}
        >
          <div className="flex items-center gap-3">
            {userDone ? (
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white"
              >
                ✓
              </span>
            ) : null}

            <div>
              <div
                className={`text-base font-bold ${
                  userDone ? "text-emerald-950" : "text-slate-950"
                }`}
              >
                {userDone ? "MVP erledigt" : "MVP Voting"}
              </div>
              <div className="mt-1 text-sm text-slate-600">{collapsedSummary}</div>
            </div>
          </div>

          <div className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            Aufklappen
          </div>
        </button>
      </section>
    );
  }

  return (
    <section className={shellClassName}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className={`absolute right-0 top-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            userDone
              ? "border border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Einklappen
        </button>

        <div className="pr-28">
          <div className={`text-sm font-semibold ${titleColorClass}`}>
            ⭐ MVP Voting
          </div>

          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-950">
            Spieler des Trainings wählen
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Alle anwesenden Teilnehmer können hier direkt ihren MVP wählen.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <VoteCountPill
              voteCount={state.voteCount}
              eligibleVoterCount={state.eligibleVoterCount}
              votingOpen={votingOpen}
            />

            <ResultPill
              text={
                votingOpen
                  ? `Offen bis ${state.revealLabel}`
                  : `Ergebnis seit ${state.revealLabel}`
              }
              tone={pillTone}
            />
          </div>
        </div>
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

      {votingOpen ? (
        <>
          <div
            className={`mt-4 rounded-2xl border px-4 py-4 ${
              state.userHasVoted
                ? "border-emerald-200 bg-white"
                : "border-amber-200 bg-white"
            }`}
          >
            <div
              className={`text-sm font-semibold ${
                state.userHasVoted ? "text-emerald-800" : "text-amber-800"
              }`}
            >
              {state.voteCount} von {state.eligibleVoterCount} haben abgestimmt
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  state.userHasVoted ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Sichtbar ist nur, wer bereits abgestimmt hat — nicht, für wen.
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {state.votedByNames.length > 0 ? (
                state.votedByNames.map((name) => (
                  <span
                    key={name}
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      state.userHasVoted
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    {name}
                  </span>
                ))
              ) : (
                <div className="text-sm text-slate-500">
                  Bisher hat noch niemand abgestimmt.
                </div>
              )}
            </div>
          </div>

          {state.canVote ? (
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
                            ? "border-emerald-400 bg-emerald-100 text-emerald-900"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-2">
                          <span className="truncate">{player.name}</span>
                          <PlayerBadge
                            mvpCount={safeMvpCount(player.mvpCount)}
                            size="sm"
                            hideIfNone
                            iconOnly
                          />
                        </div>
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
                        <div className="flex items-center gap-2">
                          <span className="truncate">{player.name}</span>
                          <PlayerBadge
                            mvpCount={safeMvpCount(player.mvpCount)}
                            size="sm"
                            hideIfNone
                            iconOnly
                          />
                        </div>
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
                    {state.voteCount} von {state.eligibleVoterCount} Stimmen · Ergebnis ab{" "}
                    {state.revealLabel}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
              Abstimmen können nur anwesende Teilnehmer mit verknüpftem Spielerprofil.
            </div>
          )}
        </>
      ) : (
        <div className="mt-4 space-y-4">
          {state.results?.winners && state.results.winners.length > 0 ? (
            state.results.winners.length === 1 ? (
              <MergedWinnerCard
                winner={state.results.winners[0]}
                badgeUpgrade={badgeUpgrade}
              />
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-amber-200 bg-white px-4 py-4">
                  <div className="text-sm font-semibold text-amber-700">🏆 MVP</div>
                  <div className="mt-2 text-lg font-extrabold text-slate-950">
                    {state.results.winners.map((winner) => winner.name).join(", ")}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Gleichstand mit je {state.results.winners[0].votes} Stimmen
                  </div>
                </div>

                {state.results.winners.map((winner) => (
                  <MergedWinnerCard
                    key={winner.playerId}
                    winner={winner}
                    badgeUpgrade={
                      badgeUpgrade?.playerId === winner.playerId ? badgeUpgrade : null
                    }
                  />
                ))}
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
              Noch keine Stimmen abgegeben.
            </div>
          )}

          {state.results?.leaderboard && state.results.leaderboard.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">
                  Voting-Ergebnis
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  {state.voteCount} {state.voteCount === 1 ? "Stimme" : "Stimmen"}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {state.results.leaderboard.map((entry, index) => (
                  <div
                    key={entry.playerId}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                        {index + 1}
                      </div>

                      <div className="flex min-w-0 items-center gap-2">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {entry.name}
                        </div>
                        <PlayerBadge
                          mvpCount={safeMvpCount(entry.mvpCount)}
                          size="sm"
                          hideIfNone
                          iconOnly
                        />
                      </div>
                    </div>

                    <div className="shrink-0 text-sm font-semibold text-slate-600">
                      {entry.votes} {entry.votes === 1 ? "Stimme" : "Stimmen"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}