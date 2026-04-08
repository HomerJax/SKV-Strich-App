"use client";

import { useState } from "react";

type SessionEndModalProps = {
  open: boolean;
  onClose: () => void;
  teamA: {
    name: string;
    players: string[];
  };
  teamB: {
    name: string;
    players: string[];
  };
  scoreA: number;
  scoreB: number;
  wasUnderdog?: boolean;
  onShareInternal: () => void;
  onShareSocial: () => void;
  sharingInternal?: boolean;
  sharingSocial?: boolean;
};

function getHeadline(scoreA: number, scoreB: number) {
  const diff = Math.abs(scoreA - scoreB);

  if (scoreA === scoreB) return "Hart umkämpft 🤝";
  if (diff >= 4) return "Klare Sache 💥";
  if (diff === 1) return "Ganz enges Ding 🔥";
  return "Starkes Spiel ⚽";
}

export default function SessionEndModal({
  open,
  onClose,
  teamA,
  teamB,
  scoreA,
  scoreB,
  wasUnderdog = false,
  onShareInternal,
  onShareSocial,
  sharingInternal = false,
  sharingSocial = false,
}: SessionEndModalProps) {
  const [sharingMvpVoting, setSharingMvpVoting] = useState(false);
  const [mvpShareMessage, setMvpShareMessage] = useState<string | null>(null);

  if (!open) return null;

  const headline = getHeadline(scoreA, scoreB);

  async function handleShareMvpVoting() {
    try {
      setSharingMvpVoting(true);
      setMvpShareMessage(null);

      const sessionUrl =
        typeof window !== "undefined" ? window.location.href : "/sessions";

      const shareText = `⭐ MVP Voting läuft jetzt bei STRIKR!

Das Training ist vorbei und das Voting ist eröffnet.
Alle Teilnehmer dürfen abstimmen.

Das Voting läuft bis morgen 10:00 Uhr.

Jetzt abstimmen:
${sessionUrl}`;

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "MVP Voting läuft jetzt",
          text: shareText,
        });

        setMvpShareMessage("MVP Voting erfolgreich geteilt.");
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setMvpShareMessage(
          "Voting-Text in die Zwischenablage kopiert. Jetzt in eure Gruppe einfügen."
        );
        return;
      }

      throw new Error("Teilen wird auf diesem Gerät nicht unterstützt.");
    } catch {
      setMvpShareMessage(
        "MVP Voting konnte nicht direkt geteilt werden. Bitte Link manuell kopieren."
      );
    } finally {
      setSharingMvpVoting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-2xl rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <div className="text-sm font-semibold text-slate-500">
              Ergebnis gespeichert
            </div>
            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Training abgeschlossen
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Teile jetzt die SiegerCard nach außen, poste das Ergebnis mit
              App-Link in eure Gruppe oder starte direkt das MVP Voting in eurer
              WhatsApp-Gruppe.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            aria-label="Modal schließen"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div className="text-sm font-semibold text-slate-500">
              Spielmoment
            </div>

            <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              {headline}
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">
                {scoreA}:{scoreB}
              </div>
            </div>

            {wasUnderdog ? (
              <div className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                Underdog-Moment
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {teamA.name}
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  {teamA.players.length > 0
                    ? teamA.players.join(", ")
                    : "Keine Spieler"}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {teamB.name}
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  {teamB.players.length > 0
                    ? teamB.players.join(", ")
                    : "Keine Spieler"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <div className="text-sm font-semibold text-amber-900">
              MVP Voting beginnt jetzt
            </div>
            <div className="mt-1 text-sm text-amber-800">
              Alle Teilnehmer dürfen jetzt abstimmen. Das Voting läuft bis morgen
              10:00 Uhr.
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onShareSocial}
              disabled={sharingSocial}
              className="inline-flex min-h-[56px] items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sharingSocial
                ? "Teilt SiegerCard..."
                : "📸 SiegerCard auf Social Media teilen"}
            </button>

            <button
              type="button"
              onClick={onShareInternal}
              disabled={sharingInternal}
              className="inline-flex min-h-[56px] items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sharingInternal
                ? "Teilt Gruppenpost..."
                : "💬 Ergebnis in Gruppe posten"}
            </button>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={handleShareMvpVoting}
              disabled={sharingMvpVoting}
              className="inline-flex min-h-[56px] w-full items-center justify-center rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sharingMvpVoting
                ? "Teilt MVP Voting..."
                : "⭐ MVP Voting in Gruppe teilen"}
            </button>
          </div>

          {mvpShareMessage ? (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
              {mvpShareMessage}
            </div>
          ) : null}

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Social Media teilen = fertige SiegerCard als Bild. In Gruppe posten =
            kurzer Teaser mit Ergebnis, Emotion und Link zurück in die App. MVP
            Voting teilen = kurzer Call-to-Action zum Abstimmen für alle
            Teilnehmer.
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}