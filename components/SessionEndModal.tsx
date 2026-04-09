"use client";

import { useEffect, useState } from "react";

type SessionEndModalProps = {
  open: boolean;
  onClose: () => void;
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

  if (scoreA === scoreB) return "Hart umkämpft";
  if (diff >= 4) return "Klare Sache";
  if (diff === 1) return "Ganz enges Ding";
  return "Starkes Spiel";
}

export default function SessionEndModal({
  open,
  onClose,
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

  useEffect(() => {
    if (!open) {
      setMvpShareMessage(null);
      setSharingMvpVoting(false);
    }
  }, [open]);

  if (!open) return null;

  const headline = getHeadline(scoreA, scoreB);

  async function handleShareMvpVoting() {
    try {
      setSharingMvpVoting(true);
      setMvpShareMessage(null);

      const sessionUrl =
        typeof window !== "undefined" ? window.location.href : "/sessions";

      const shareText = `Training ist vorbei und das MVP Voting ist eröffnet.

Alle Teilnehmer können jetzt ihren Spieler des Trainings wählen.

Direkt zur Session und dort im Bereich "MVP Voting" abstimmen:
${sessionUrl}`;

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "MVP Voting ist eröffnet",
          text: shareText,
        });
        setMvpShareMessage("MVP Voting erfolgreich geteilt.");
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setMvpShareMessage("Voting-Text kopiert.");
        return;
      }

      throw new Error("Teilen wird auf diesem Gerät nicht unterstützt.");
    } catch {
      setMvpShareMessage("Teilen nicht möglich.");
    } finally {
      setSharingMvpVoting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="absolute inset-x-0 bottom-0 top-auto flex max-h-[92dvh] justify-center p-3 sm:inset-0 sm:items-center sm:p-4">
        <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-500">
                Ergebnis gespeichert
              </div>
              <h2 className="mt-1 text-lg font-bold text-slate-950 sm:text-xl">
                Training abgeschlossen
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Teile jetzt Ergebnis oder starte das MVP Voting.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              aria-label="Modal schließen"
            >
              ✕
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-500">
                Spielmoment
              </div>
              <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
                {headline}
              </div>
              <div className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                {scoreA}:{scoreB}
              </div>

              {wasUnderdog ? (
                <div className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  Underdog-Moment
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={onShareSocial}
                disabled={sharingSocial}
                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sharingSocial
                  ? "Teilt SiegerCard..."
                  : "📸 SiegerCard auf Social Media teilen"}
              </button>

              <button
                type="button"
                onClick={onShareInternal}
                disabled={sharingInternal}
                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sharingInternal
                  ? "Teilt Gruppenpost..."
                  : "💬 Ergebnis in Gruppe posten"}
              </button>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="text-sm font-semibold text-amber-900">
                  MVP Voting beginnt jetzt
                </div>
                <div className="mt-1 text-sm text-amber-800">
                  Teile den Link mit eurer Gruppe. Abgestimmt wird direkt in
                  dieser Session im Bereich „MVP Voting“.
                </div>
              </div>

              <button
                type="button"
                onClick={handleShareMvpVoting}
                disabled={sharingMvpVoting}
                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
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
          </div>

          <div className="shrink-0 border-t border-slate-200 px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}