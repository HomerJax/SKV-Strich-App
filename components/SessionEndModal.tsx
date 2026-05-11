/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";

type SessionEndModalProps = {
  open: boolean;
  onClose: () => void;
  scoreA: number;
  scoreB: number;
  wasUnderdog?: boolean;
  winnerPhotoUrl?: string | null;
  onShareSocial: () => void;
  sharingSocial?: boolean;
  resultShareReady?: boolean;
  preparingResultShare?: boolean;
  resultShareMessage?: string | null;
  mvpVotingEnabled?: boolean;
  showMvpVotingFollowup?: boolean;
};

function getHeadline(scoreA: number, scoreB: number) {
  const diff = Math.abs(scoreA - scoreB);

  if (scoreA === scoreB) return "Hart umkämpft";
  if (diff >= 4) return "Klare Sache";
  if (diff === 1) return "Ganz enges Ding";
  return "Starkes Spiel";
}

function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  const styles =
    tone === "success"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "warning"
        ? "bg-amber-100 text-amber-900"
        : "bg-white/10 text-white";

  return (
    <div
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${styles}`}
    >
      {children}
    </div>
  );
}

function Button({
  children,
  onClick,
  disabled = false,
  tone = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "primary" | "secondary" | "warning";
}) {
  const styles =
    tone === "primary"
      ? "bg-slate-950 text-white hover:bg-slate-800"
      : tone === "warning"
        ? "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${styles} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

function appendCacheBuster(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}modal_ts=${Date.now()}`;
}

function HeroPhotoPreview({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);

  const previewSrc = src ? appendCacheBuster(src) : null;

  if (!previewSrc || failed) {
    return (
      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/10 p-2">
        <div className="flex h-full min-h-[132px] w-full items-center justify-center rounded-[16px] bg-slate-950/30 text-center text-xs font-medium text-white/55">
          Kein Foto
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/10 p-2">
      <div className="flex h-full min-h-[132px] w-full items-center justify-center overflow-hidden rounded-[16px] bg-slate-950/30">
        <img
          src={previewSrc}
          alt="Siegerfoto Vorschau"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    </div>
  );
}

export default function SessionEndModal({
  open,
  onClose,
  scoreA,
  scoreB,
  wasUnderdog = false,
  winnerPhotoUrl = null,
  onShareSocial,
  sharingSocial = false,
  resultShareReady = false,
  preparingResultShare = false,
  resultShareMessage = null,
  mvpVotingEnabled = false,
  showMvpVotingFollowup = false,
}: SessionEndModalProps) {
  const [showMvpFollowup, setShowMvpFollowup] = useState(false);
  const [sharingMvpVoting, setSharingMvpVoting] = useState(false);
  const [mvpShareMessage, setMvpShareMessage] = useState<string | null>(null);

  if (!open) return null;

  const headline = getHeadline(scoreA, scoreB);
  const shareBusy = sharingSocial || preparingResultShare;

  async function handleShareMvpVoting() {
    try {
      setSharingMvpVoting(true);
      setMvpShareMessage(null);

      const sessionUrl =
        typeof window !== "undefined" ? window.location.href : "/sessions";

      const shareText = `MVP Voting ist eröffnet 🔥

Stimme jetzt für den Spieler des Trainings ab.

Voting läuft bis morgen 10:00 Uhr.

👉 ${sessionUrl}`;

      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: "MVP Voting",
          text: shareText,
        });
        setMvpShareMessage("MVP Voting erfolgreich geteilt.");
        return;
      }

      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(shareText);
        setMvpShareMessage("Link kopiert – in WhatsApp einfügen 👍");
        return;
      }

      if (typeof window !== "undefined") {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(shareText)}`,
          "_blank",
          "noopener,noreferrer"
        );
        setMvpShareMessage("WhatsApp wurde geöffnet.");
        return;
      }

      throw new Error("Teilen nicht möglich");
    } catch {
      setMvpShareMessage("Teilen nicht möglich.");
    } finally {
      setSharingMvpVoting(false);
    }
  }

  function handleCloseMain() {
    if (mvpVotingEnabled && showMvpVotingFollowup) {
      setShowMvpFollowup(true);
      return;
    }
    setShowMvpFollowup(false);
    setSharingMvpVoting(false);
    setMvpShareMessage(null);
    onClose();
  }

  function handleCloseAll() {
    setShowMvpFollowup(false);
    setSharingMvpVoting(false);
    setMvpShareMessage(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Modal schließen"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
        onClick={showMvpFollowup ? handleCloseAll : handleCloseMain}
      />

      <div className="absolute inset-x-0 bottom-0 top-auto flex max-h-[92dvh] justify-center p-3 sm:inset-0 sm:items-center sm:p-4">
        {!showMvpFollowup ? (
          <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_42%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#334155_100%)] px-4 py-4 text-white sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                    Ergebnis gespeichert
                  </div>

                  <h2 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-white">
                    Training abgeschlossen
                  </h2>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Pill>{headline}</Pill>
                    {wasUnderdog ? <Pill tone="warning">Underdog</Pill> : null}
                    {mvpVotingEnabled ? <Pill tone="success">MVP läuft</Pill> : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseMain}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-lg text-white transition hover:bg-white/15"
                  aria-label="Modal schließen"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_112px] gap-3">
                <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                    Endstand
                  </div>
                  <div className="mt-2 text-5xl font-black tracking-tight text-white sm:text-6xl">
                    {scoreA}:{scoreB}
                  </div>
                </div>

                <HeroPhotoPreview
                  key={`${open ? "open" : "closed"}-${winnerPhotoUrl ?? "none"}`}
                  src={winnerPhotoUrl ?? null}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">
                  Jetzt teilen
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-600">
                  Teile die SiegerCard direkt weiter.
                </div>

                <div className="mt-4">
                  <Button
                    onClick={onShareSocial}
                    disabled={shareBusy}
                    tone="primary"
                  >
                    {sharingSocial
                      ? "SiegerCard wird geteilt..."
                      : preparingResultShare
                        ? "SiegerCard wird vorbereitet..."
                        : "SiegerCard teilen"}
                  </Button>
                </div>
              </div>

              {preparingResultShare ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  SiegerCard wird vorbereitet ...
                </div>
              ) : null}

              {resultShareMessage ? (
                <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                  {resultShareMessage}
                </div>
              ) : null}

              {resultShareReady && !preparingResultShare && !resultShareMessage ? (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  SiegerCard ist bereit.
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-200 p-3">
              <Button tone="secondary" onClick={handleCloseMain}>
                Schließen
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-amber-50 px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                    Nächster Schritt
                  </div>

                  <h2 className="mt-2 text-xl font-extrabold tracking-tight text-slate-950">
                    MVP Voting läuft jetzt
                  </h2>

                  <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200">
                    Offen bis morgen, 10:00 Uhr
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseAll}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white text-lg text-slate-700 transition hover:bg-amber-100"
                  aria-label="Modal schließen"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm leading-6 text-amber-900">
                  Teile den Hinweis jetzt mit eurer Gruppe. Abgestimmt wird
                  direkt in dieser Session im Bereich „MVP Voting“.
                </div>

                <div className="mt-4">
                  <Button
                    onClick={handleShareMvpVoting}
                    disabled={sharingMvpVoting}
                    tone="warning"
                  >
                    {sharingMvpVoting ? "Wird geteilt..." : "MVP Voting teilen"}
                  </Button>
                </div>
              </div>

              {mvpShareMessage ? (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  {mvpShareMessage}
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-200 p-3">
              <Button tone="secondary" onClick={handleCloseAll}>
                Fertig
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}