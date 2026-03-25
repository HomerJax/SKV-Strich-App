import Image from "next/image";
import { ChangeEvent, RefObject } from "react";

type SessionResultCardProps = {
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
  winnerPhotoInputRef: RefObject<HTMLInputElement | null>;
  onGoalsAChange: (value: string) => void;
  onGoalsBChange: (value: string) => void;
  onDeleteResult: () => void;
  onWinnerPhotoUpload: (event: ChangeEvent<HTMLInputElement>) => void;
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
}: SessionResultCardProps) {
  return (
    <div className="space-y-3 rounded-xl border bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold">Ergebnis</div>
          <div className="text-[11px] text-slate-500">
            {hasResult
              ? "Ergebnis ist gespeichert und sperrt Anwesenheit und Teams."
              : "Sobald Teams fertig sind, kannst du das Ergebnis speichern."}
          </div>
        </div>

        {hasResult && (
          <button
            disabled={saving || photoBusy}
            onClick={onDeleteResult}
            className={`rounded-lg border bg-red-50 px-3 py-1.5 text-xs shadow-sm ${
              saving || photoBusy ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            {saving ? "Lösche…" : "Ergebnis löschen"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={goalsA}
          onChange={(e) => onGoalsAChange(e.target.value)}
          placeholder="Team 1"
          inputMode="numeric"
          disabled={saving}
          className="w-16 rounded-md border px-2 py-1 text-center disabled:opacity-60"
        />
        <span className="text-sm">:</span>
        <input
          value={goalsB}
          onChange={(e) => onGoalsBChange(e.target.value)}
          placeholder="Team 2"
          inputMode="numeric"
          disabled={saving}
          className="w-16 rounded-md border px-2 py-1 text-center disabled:opacity-60"
        />
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-800">Siegerfoto</div>
            <div className="text-[11px] text-slate-500">
              Optional für Ergebniskarte und Teilen.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={winnerPhotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onWinnerPhotoUpload}
              disabled={photoBusy || !canUploadWinnerPhoto}
            />

            <button
              type="button"
              onClick={() => winnerPhotoInputRef.current?.click()}
              disabled={photoBusy || !canUploadWinnerPhoto}
              className={`rounded-lg border bg-white px-3 py-1.5 text-xs ${
                photoBusy || !canUploadWinnerPhoto
                  ? "cursor-not-allowed opacity-60"
                  : ""
              }`}
            >
              {hasWinnerPhoto ? "Foto ersetzen" : "Foto hochladen"}
            </button>

            {hasWinnerPhoto && (
              <button
                type="button"
                onClick={onWinnerPhotoDelete}
                disabled={photoBusy || saving}
                className={`rounded-lg border bg-red-50 px-3 py-1.5 text-xs ${
                  photoBusy || saving ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                Foto löschen
              </button>
            )}
          </div>
        </div>

        {!hasResult && (
          <div className="text-[11px] text-slate-500">
            Siegerfoto ist erst verfügbar, wenn das Ergebnis gespeichert wurde.
          </div>
        )}

        {photoBusy && (
          <div className="text-[11px] text-slate-500">
            Foto wird verarbeitet…
          </div>
        )}

        {winnerPhotoUrl ? (
          <div className="rounded-xl border border-slate-200 bg-white p-2">
            <div className="w-full max-w-[140px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <Image
                src={winnerPhotoUrl}
                alt="Siegerfoto"
                width={140}
                height={96}
                unoptimized
                className="h-24 w-full object-cover"
              />
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400">
            Noch kein Siegerfoto hinterlegt.
          </div>
        )}
      </div>

      {!canShareResult && (
        <div className="text-[11px] text-slate-500">
          Ergebnis teilen ist verfügbar, sobald beide Teams Spieler haben und
          beide Tore gültig eingetragen sind.
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          disabled={saving || photoBusy}
          onClick={onSaveResult}
          className={`rounded-xl px-3 py-2 text-xs font-semibold shadow-sm transition ${
            saving || photoBusy
              ? "cursor-not-allowed border border-emerald-200 bg-emerald-100 text-emerald-900 opacity-60"
              : "border border-emerald-300 bg-emerald-200 text-emerald-950 hover:bg-emerald-300"
          }`}
        >
          {saving ? "Speichere…" : "Ergebnis speichern"}
        </button>

        <button
          onClick={onShareResult}
          disabled={sharingResult || !canShareResult}
          className={`rounded-xl border bg-white px-3 py-2 text-xs shadow-sm transition ${
            sharingResult || !canShareResult
              ? "cursor-not-allowed opacity-60"
              : "hover:bg-slate-50"
          }`}
        >
          {sharingResult ? "Teile…" : "Ergebnis teilen"}
        </button>
      </div>

      <div className="text-[11px] text-slate-500">
        Hinweis: Nach dem Speichern sind Aufstellungen & Anwesenheit gesperrt.
        Wenn ein Spieler fehlt, lösche das Ergebnis, passe Aufstellungen an und
        trage das Ergebnis erneut ein.
      </div>
    </div>
  );
}