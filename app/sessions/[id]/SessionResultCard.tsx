"use client";

import { useState } from "react";

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
  winnerPhotoInputRef: React.RefObject<HTMLInputElement | null>;

  onGoalsAChange: (value: string) => void;
  onGoalsBChange: (value: string) => void;
  onDeleteResult: () => void;
  onWinnerPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onWinnerPhotoDelete: () => void;
  onSaveResult: () => void;
  onShareResult: () => void;
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
  winnerPhotoInputRef,
  onGoalsAChange,
  onGoalsBChange,
  onDeleteResult,
  onWinnerPhotoUpload,
  onWinnerPhotoDelete,
  onSaveResult,
  onShareResult,
}: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* HEADER */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="text-sm font-semibold text-slate-900">
          Ergebnis & Siegerfoto
        </div>

        <div className="text-xs text-slate-500">
          {open ? "Einklappen" : "Öffnen"}
        </div>
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-100 px-4 pb-4 pt-4">
          {/* SCORE INPUT */}
          <div className="flex items-center justify-center gap-3">
            <input
              value={goalsA}
              onChange={(e) => onGoalsAChange(e.target.value)}
              className="w-16 rounded-xl border px-3 py-2 text-center text-lg font-bold"
              placeholder="0"
              inputMode="numeric"
            />

            <span className="text-lg font-bold text-slate-500">:</span>

            <input
              value={goalsB}
              onChange={(e) => onGoalsBChange(e.target.value)}
              className="w-16 rounded-xl border px-3 py-2 text-center text-lg font-bold"
              placeholder="0"
              inputMode="numeric"
            />
          </div>

          {/* RESULT + PHOTO INLINE */}
          {(hasResult || winnerPhotoUrl) && (
            <div className="flex items-center justify-center gap-3">
              {/* Ergebnis */}
              {hasResult && (
                <div className="text-lg font-bold text-slate-900">
                  {goalsA} : {goalsB}
                </div>
              )}

              {/* Mini Foto */}
              {winnerPhotoUrl && (
                <img
                  src={winnerPhotoUrl}
                  alt="Siegerfoto"
                  className="h-14 w-14 rounded-lg object-cover border border-slate-200"
                />
              )}

              {/* Upload */}
              {canUploadWinnerPhoto && (
                <button
                  onClick={() =>
                    winnerPhotoInputRef.current?.click()
                  }
                  className="text-xs text-slate-500 underline"
                >
                  Foto
                </button>
              )}

              {/* Delete Foto */}
              {hasWinnerPhoto && (
                <button
                  onClick={onWinnerPhotoDelete}
                  disabled={photoBusy}
                  className="text-xs text-red-500 underline"
                >
                  löschen
                </button>
              )}
            </div>
          )}

          {/* HIDDEN INPUT */}
          <input
            ref={winnerPhotoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onWinnerPhotoUpload}
          />

          {/* ACTIONS */}
          <div className="flex flex-col gap-2">
            {!hasResult && (
              <button
                onClick={onSaveResult}
                disabled={saving}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Ergebnis speichern
              </button>
            )}

            {hasResult && (
              <button
                onClick={onDeleteResult}
                disabled={saving}
                className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
              >
                Ergebnis löschen
              </button>
            )}

            {/* SHARE */}
            {hasResult && (
              <button
                onClick={onShareResult}
                disabled={!canShareResult || sharingResult}
                className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
              >
                Ergebnis & Foto teilen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}