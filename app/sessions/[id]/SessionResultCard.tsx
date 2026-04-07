"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ChangeEvent, RefObject } from "react";

type Props = {
  hasResult: boolean;
  saving: boolean;
  photoBusy: boolean;
  goalsA: string;
  goalsB: string;
  canShareResult: boolean;
  canUploadWinnerPhoto: boolean;
  winnerPhotoUrl: string | null;
  hasWinnerPhoto: boolean;
  sharingResult: boolean;
  sharingInternal: boolean;
  winnerPhotoInputRef: RefObject<HTMLInputElement | null>;
  onGoalsAChange: (value: string) => void;
  onGoalsBChange: (value: string) => void;
  onDeleteResult: () => void;
  onWinnerPhotoUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onWinnerPhotoDelete: () => void;
  onSaveResult: () => void;
  onShareResult: () => void;
  onShareInternal: () => void;
  title?: string;
  description?: string;
  showResultSection?: boolean;
  showPhotoSection?: boolean;
  showShareSection?: boolean;
};

export default function SessionResultCard({
  hasResult,
  saving,
  photoBusy,
  goalsA,
  goalsB,
  canShareResult,
  canUploadWinnerPhoto,
  winnerPhotoUrl,
  hasWinnerPhoto,
  sharingResult,
  sharingInternal,
  winnerPhotoInputRef,
  onGoalsAChange,
  onGoalsBChange,
  onDeleteResult,
  onWinnerPhotoUpload,
  onWinnerPhotoDelete,
  onSaveResult,
  onShareResult,
  onShareInternal,
  title,
  description,
  showResultSection = true,
  showPhotoSection = true,
  showShareSection = true,
}: Props) {
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      const nextPreviewUrl = URL.createObjectURL(file);

      setLocalPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) {
          URL.revokeObjectURL(prev);
        }
        return nextPreviewUrl;
      });
    }

    onWinnerPhotoUpload(event);
  }

  const previewUrl = localPreviewUrl || winnerPhotoUrl;

  return (
    <section className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-500">
            {showResultSection && !showPhotoSection
              ? "Ergebnis"
              : !showResultSection && showPhotoSection
                ? "Siegerfoto"
                : "Session-Abschluss"}
          </div>

          <h2 className="mt-1 text-xl font-bold text-slate-950">
            {title ??
              (showResultSection && !showPhotoSection
                ? "Ergebnis eintragen"
                : !showResultSection && showPhotoSection
                  ? "Siegerfoto hochladen"
                  : "Ergebnis & Siegerfoto")}
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            {description ??
              (showResultSection && !showPhotoSection
                ? "Trage das Endergebnis ein und speichere es."
                : !showResultSection && showPhotoSection
                  ? "Optional: Lade direkt nach dem Training ein Siegerfoto hoch."
                  : "Trage das Ergebnis ein und ergänze optional ein Siegerfoto.")}
          </p>
        </div>

        {showResultSection ? (
          hasResult ? (
            <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              Gespeichert
            </div>
          ) : (
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Offen
            </div>
          )
        ) : hasWinnerPhoto || previewUrl ? (
          <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Foto vorhanden
          </div>
        ) : (
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Optional
          </div>
        )}
      </div>

      {showResultSection ? (
        <>
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:max-w-xs">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Team A
              </label>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={goalsA}
                onChange={(event) => onGoalsAChange(event.target.value)}
                disabled={saving}
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-center text-lg font-bold text-slate-950 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
              />
            </div>

            <div className="pt-5 text-lg font-bold text-slate-500">:</div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Team B
              </label>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={goalsB}
                onChange={(event) => onGoalsBChange(event.target.value)}
                disabled={saving}
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-center text-lg font-bold text-slate-950 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onSaveResult}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Speichert..."
                : hasResult
                  ? "Ergebnis aktualisieren"
                  : "Ergebnis speichern"}
            </button>

            {hasResult ? (
              <button
                type="button"
                onClick={onDeleteResult}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Ergebnis löschen
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {showPhotoSection ? (
        <div className={showResultSection ? "mt-6 border-t border-slate-200 pt-5" : "mt-5"}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-500">Siegerfoto</div>
              <h3 className="mt-1 text-base font-bold text-slate-950">
                Foto hochladen
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Optional: Ein kleines Siegerfoto ergänzen.
              </p>
            </div>

            {hasWinnerPhoto || previewUrl ? (
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Vorhanden
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {previewUrl ? (
                  <Image
                    key={previewUrl}
                    src={previewUrl}
                    alt="Siegerfoto"
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <div className="text-[10px] font-medium text-slate-400">
                    Kein Foto
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <input
                  ref={winnerPhotoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  disabled={!canUploadWinnerPhoto || photoBusy || saving}
                  className="block text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-60"
                />

                {hasWinnerPhoto || previewUrl ? (
                  <button
                    type="button"
                    onClick={onWinnerPhotoDelete}
                    disabled={photoBusy || saving}
                    className="inline-flex w-fit items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {photoBusy ? "Löscht..." : "Foto löschen"}
                  </button>
                ) : null}
              </div>
            </div>

            {showShareSection ? (
              <div className="flex flex-col gap-2 sm:items-end">
                <button
                  type="button"
                  onClick={onShareResult}
                  disabled={!canShareResult || sharingResult}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sharingResult
                    ? "Teilt SiegerCard..."
                    : "📸 SiegerCard auf Social Media teilen"}
                </button>

                <button
                  type="button"
                  onClick={onShareInternal}
                  disabled={!canShareResult || sharingInternal}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sharingInternal
                    ? "Postet Ergebnis..."
                    : "💬 Ergebnis in Gruppe posten"}
                </button>

                <div className="max-w-[300px] text-right text-[11px] text-slate-400">
                  Social Media teilen = fertige SiegerCard als Bild. In Gruppe
                  posten = kurzer Teaser mit Ergebnis, Emotion und Link zurück in
                  die App.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}