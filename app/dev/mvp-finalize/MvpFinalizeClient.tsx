"use client";

import Link from "next/link";
import { useState } from "react";

type FinalizeResult = {
  sessionId?: number;
  hasResult?: boolean;
  votingOpen?: boolean;
  revealLabel?: string | null;
  voteCount?: number;
  eligibleVoterCount?: number;
  votedByNames?: string[];
  results?: {
    winners?: Array<{
      playerId: number;
      name: string;
      votes: number;
      mvpCount: number;
    }>;
    leaderboard?: Array<{
      playerId: number;
      name: string;
      votes: number;
      mvpCount: number;
    }>;
    totalVotes?: number;
  } | null;
};

export default function MvpFinalizeClient() {
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FinalizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedSessionId = sessionId.trim();

  async function handleFinalize() {
    setError(null);
    setResult(null);

    const numericSessionId = Number(normalizedSessionId);

    if (!Number.isFinite(numericSessionId) || numericSessionId <= 0) {
      setError("Bitte eine gültige Session-ID eingeben.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/sessions/${numericSessionId}/mvp?forceFinalize=1`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error || "MVP Voting konnte nicht finalisiert werden."
        );
      }

      setResult(payload as FinalizeResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "MVP Voting konnte nicht finalisiert werden."
      );
    } finally {
      setLoading(false);
    }
  }

  const winnerNames =
    result?.results?.winners?.map((winner) => winner.name).join(", ") || null;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">
        Power User Tool
      </div>

      <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
        MVP Voting manuell finalisieren
      </h1>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Nutze dieses Tool nur für Staging-/Testsessions. Die Session wird
        wirklich finalisiert, MVP Counts werden erhöht und Notifications werden
        erzeugt.
      </p>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Wichtig: Nicht für echte Produktivsessions verwenden. Das Voting wird
        sofort beendet.
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={sessionId}
          onChange={(event) => setSessionId(event.target.value)}
          inputMode="numeric"
          placeholder="Session-ID, z. B. 256"
          className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-400"
        />

        <button
          type="button"
          onClick={handleFinalize}
          disabled={loading}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Finalisiere…" : "Voting jetzt beenden"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-black text-emerald-900">
            MVP Voting finalisiert
          </div>

          <div className="mt-3 grid gap-2 text-sm text-emerald-900">
            <div>
              <span className="font-bold">Session:</span>{" "}
              {result.sessionId ?? normalizedSessionId}
            </div>
            <div>
              <span className="font-bold">Voting offen:</span>{" "}
              {result.votingOpen ? "Ja" : "Nein"}
            </div>
            <div>
              <span className="font-bold">Stimmen:</span>{" "}
              {result.voteCount ?? 0} von {result.eligibleVoterCount ?? 0}
            </div>
            <div>
              <span className="font-bold">MVP:</span>{" "}
              {winnerNames ?? "Kein Gewinner ermittelt"}
            </div>
          </div>

          <div className="mt-4">
            <Link
              href={`/sessions/${result.sessionId ?? normalizedSessionId}`}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              Session öffnen
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
