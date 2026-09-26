/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { fetchImageAsFile, shareImageFile } from "@/lib/share/utils";
import { useI18n } from "@/components/i18n/I18nProvider";
import { translate } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/config";

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

function getHeadline(scoreA: number, scoreB: number, locale: AppLocale) {
  const diff = Math.abs(scoreA - scoreB);

  if (scoreA === scoreB) return translate(locale, "sessionEnd.drawHeadline");
  if (diff >= 4) return translate(locale, "sessionEnd.clearHeadline");
  if (diff === 1) return translate(locale, "sessionEnd.closeHeadline");
  return translate(locale, "sessionEnd.strongHeadline");
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

function HeroPhotoPreview({
  src,
  noPhotoLabel,
  previewAlt,
}: {
  src: string | null;
  noPhotoLabel: string;
  previewAlt: string;
}) {
  const [failed, setFailed] = useState(false);

  const previewSrc = src ? appendCacheBuster(src) : null;

  if (!previewSrc || failed) {
    return (
      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/10 p-2">
        <div className="flex h-full min-h-[132px] w-full items-center justify-center rounded-[16px] bg-slate-950/30 text-center text-xs font-medium text-white/55">
          {noPhotoLabel}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/10 p-2">
      <div className="flex h-full min-h-[132px] w-full items-center justify-center overflow-hidden rounded-[16px] bg-slate-950/30">
        <img
          src={previewSrc}
          alt={previewAlt}
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
  const { locale, t } = useI18n();
  const [showMvpFollowup, setShowMvpFollowup] = useState(false);
  const [sharingMvpVoting, setSharingMvpVoting] = useState(false);
  const [mvpShareMessage, setMvpShareMessage] = useState<string | null>(null);
  const [preparedWinnerShareFile, setPreparedWinnerShareFile] = useState<File | null>(
    null
  );
  const [preparingWinnerShare, setPreparingWinnerShare] = useState(false);
  const [winnerShareMessage, setWinnerShareMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || typeof window === "undefined") {
      setPreparedWinnerShareFile(null);
      setPreparingWinnerShare(false);
      setWinnerShareMessage(null);
      return;
    }

    const sessionMatch = window.location.pathname.match(/\/sessions\/(\d+)/);
    const sessionId = sessionMatch?.[1] ?? null;

    if (!sessionId) {
      return;
    }

    let cancelled = false;

    async function prepareWinnerShare() {
      try {
        setPreparingWinnerShare(true);
        setWinnerShareMessage(null);

        const imageUrl = `/api/share/result/${sessionId}/image?lang=${locale}&modal_prepare_ts=${Date.now()}`;
        const file = await fetchImageAsFile(
          imageUrl,
          `strikr-result-${sessionId}.png`
        );

        if (cancelled) return;

        setPreparedWinnerShareFile(file);
        setWinnerShareMessage(t("sessionHook.shareCardReady"));
      } catch (error) {
        if (cancelled) return;

        setPreparedWinnerShareFile(null);
        setWinnerShareMessage(
          error instanceof Error
            ? error.message
            : t("sessionHook.shareCardPrepareFailed")
        );
      } finally {
        if (!cancelled) {
          setPreparingWinnerShare(false);
        }
      }
    }

    void prepareWinnerShare();

    return () => {
      cancelled = true;
    };
  }, [open, scoreA, scoreB, winnerPhotoUrl, t]);

  if (!open) return null;

  const headline = getHeadline(scoreA, scoreB, locale);
  const shareBusy = sharingSocial || preparingResultShare || preparingWinnerShare;
  const shareReady = Boolean(preparedWinnerShareFile) || resultShareReady;
  const displayedShareMessage = winnerShareMessage ?? resultShareMessage;

  async function handleShareWinnerCard() {
    if (!preparedWinnerShareFile) {
      onShareSocial();
      return;
    }

    try {
      setWinnerShareMessage(null);
      const result = await shareImageFile(
        preparedWinnerShareFile,
        t("sessionEnd.shareCardTitle"),
        t("sessionEnd.shareCardText")
      );

      setWinnerShareMessage(
        result.mode === "cancelled"
          ? t("sessionHook.shareCardReady")
          : t("sessionHook.shareCardShared")
      );
    } catch (error) {
      setWinnerShareMessage(
        error instanceof Error
          ? error.message
          : t("sessionHook.shareCardFailed")
      );
    }
  }

  async function handleShareMvpVoting() {
    try {
      setSharingMvpVoting(true);
      setMvpShareMessage(null);

      const sessionUrl =
        typeof window !== "undefined" ? window.location.href : "/sessions";

      const shareText = t("sessionEnd.mvpShareText", { url: sessionUrl });

      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: "MVP Voting",
          text: shareText,
        });
        setMvpShareMessage(t("sessionEnd.mvpShareSuccess"));
        return;
      }

      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(shareText);
        setMvpShareMessage(t("sessionEnd.mvpCopied"));
        return;
      }

      if (typeof window !== "undefined") {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(shareText)}`,
          "_blank",
          "noopener,noreferrer"
        );
        setMvpShareMessage(t("sessionEnd.whatsappOpened"));
        return;
      }

      throw new Error(t("sessionEnd.shareImpossible"));
    } catch {
      setMvpShareMessage(t("sessionEnd.shareImpossible"));
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
    <div className="fixed inset-0 z-[1000]">
      <button
        type="button"
        aria-label={t("sessionEnd.closeModal")}
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
        onClick={showMvpFollowup ? handleCloseAll : handleCloseMain}
      />

      <div className="absolute inset-0 flex items-end justify-center overflow-y-auto p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:items-center sm:p-4">
        {!showMvpFollowup ? (
          <div className="flex max-h-[calc(100dvh-7rem-env(safe-area-inset-bottom))] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:max-h-[92dvh]">
            <div className="shrink-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_42%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#334155_100%)] px-4 py-4 text-white sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                    {t("sessionEnd.resultSaved")}
                  </div>

                  <h2 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-white">
                    {t("sessionEnd.trainingComplete")}
                  </h2>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Pill>{headline}</Pill>
                    {wasUnderdog ? <Pill tone="warning">Underdog</Pill> : null}
                    {mvpVotingEnabled ? <Pill tone="success">{t("sessionEnd.mvpRunning")}</Pill> : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseMain}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-lg text-white transition hover:bg-white/15"
                  aria-label={t("sessionEnd.closeModal")}
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_112px] gap-3">
                <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                    {t("sessionEnd.finalScore")}
                  </div>
                  <div className="mt-2 text-5xl font-black tracking-tight text-white sm:text-6xl">
                    {scoreA}:{scoreB}
                  </div>
                </div>

                <HeroPhotoPreview
                  key={`${open ? "open" : "closed"}-${winnerPhotoUrl ?? "none"}`}
                  src={winnerPhotoUrl ?? null}
                  noPhotoLabel={t("sessionEnd.noPhoto")}
                  previewAlt={t("sessionEnd.photoPreview")}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">
                  {t("sessionEnd.shareNow")}
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-600">
                  {t("sessionEnd.shareWinnerHint")}
                </div>

                <div className="mt-4">
                  <Button
                    onClick={() => void handleShareWinnerCard()}
                    disabled={shareBusy || !shareReady}
                    tone="primary"
                  >
                    {sharingSocial
                      ? t("sessionEnd.sharingCard")
                      : shareBusy || !shareReady
                        ? t("sessionEnd.preparingCard")
                        : t("sessionEnd.shareCard")}
                  </Button>
                </div>
              </div>

              {shareBusy && !shareReady ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {t("sessionEnd.preparingNotice")}
                </div>
              ) : null}

              {displayedShareMessage ? (
                <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                  {displayedShareMessage}
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-slate-200 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <Button tone="secondary" onClick={handleCloseMain}>
                {t("sessionEnd.close")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-amber-50 px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                    {t("sessionEnd.nextStep")}
                  </div>

                  <h2 className="mt-2 text-xl font-extrabold tracking-tight text-slate-950">
                    {t("sessionEnd.mvpNow")}
                  </h2>

                  <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200">
                    {t("sessionEnd.mvpOpenUntil")}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseAll}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white text-lg text-slate-700 transition hover:bg-amber-100"
                  aria-label={t("sessionEnd.closeModal")}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm leading-6 text-amber-900">
                  {t("sessionEnd.mvpGroupHint")}
                </div>

                <div className="mt-4">
                  <Button
                    onClick={handleShareMvpVoting}
                    disabled={sharingMvpVoting}
                    tone="warning"
                  >
                    {sharingMvpVoting ? t("sessionEnd.sharing") : t("sessionEnd.shareMvp")}
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
                {t("sessionEnd.done")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
