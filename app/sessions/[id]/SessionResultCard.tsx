import { RefObject } from "react";

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
  winnerPhotoInputRef: RefObject<HTMLInputElement>;
  onGoalsAChange: (v: string) => void;
  onGoalsBChange: (v: string) => void;
  onDeleteResult: () => void;
  onWinnerPhotoUpload: (e: any) => void;
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
  return (
    <section className="rounded-2xl border bg-white p-4">
      <h2 className="font-bold mb-3">Ergebnis</h2>

      {/* RESULT */}
      <div className="flex gap-3 items-center">
        <input
          value={goalsA}
          onChange={(e) => onGoalsAChange(e.target.value)}
          className="w-16 border rounded p-2 text-center"
        />
        <span>:</span>
        <input
          value={goalsB}
          onChange={(e) => onGoalsBChange(e.target.value)}
          className="w-16 border rounded p-2 text-center"
        />
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={onSaveResult}
          disabled={saving}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Ergebnis speichern
        </button>

        {hasResult && (
          <button
            onClick={onDeleteResult}
            className="border px-4 py-2 rounded"
          >
            Löschen
          </button>
        )}
      </div>

      {/* PHOTO */}
      <div className="mt-4 border-t pt-4">
        <h3 className="text-sm font-semibold mb-2">Siegerfoto</h3>

        {winnerPhotoUrl && (
          <div className="flex items-center gap-3">
            <img
              src={winnerPhotoUrl}
              className="h-16 w-16 object-cover rounded"
            />
            <button
              onClick={onWinnerPhotoDelete}
              className="text-xs text-red-500"
            >
              Entfernen
            </button>
          </div>
        )}

        {canUploadWinnerPhoto && (
          <input
            ref={winnerPhotoInputRef}
            type="file"
            onChange={onWinnerPhotoUpload}
            className="mt-2 text-xs"
          />
        )}
      </div>

      {/* SHARE */}
      <div className="mt-4 border-t pt-4 flex justify-end">
        <button
          onClick={onShareResult}
          disabled={!canShareResult || sharingResult}
          className="border px-4 py-2 rounded"
        >
          {sharingResult
            ? "Teilt..."
            : "Ergebnis & Foto teilen"}
        </button>
      </div>
    </section>
  );
}