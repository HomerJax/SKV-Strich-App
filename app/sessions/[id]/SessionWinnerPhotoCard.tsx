"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import { compressImageFile } from "@/lib/client-images/compress-image";

const MASTER_MAX_SIZE = 2400;
const MAX_SOURCE_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type SessionWinnerPhotoCardProps = {
  hasResult: boolean;
  saving: boolean;
  photoBusy: boolean;
  canUploadWinnerPhoto: boolean;
  winnerPhotoUrl: string | null;
  hasWinnerPhoto: boolean;
  winnerPhotoInputRef: RefObject<HTMLInputElement | null>;
  onWinnerPhotoUpload: (
    event: ChangeEvent<HTMLInputElement>
  ) => void | Promise<void>;
  onWinnerPhotoDelete: () => void;
  title?: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

function SummaryPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "muted";
}) {
  const className =
    tone === "success"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "muted"
        ? "bg-slate-100 text-slate-600"
        : "bg-white text-slate-700 ring-1 ring-slate-200";

  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}
    >
      {children}
    </div>
  );
}

function ControlButton({
  children,
  onClick,
  disabled = false,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "primary" | "danger";
}) {
  const className =
    tone === "primary"
      ? "bg-slate-950 text-white hover:bg-slate-800"
      : tone === "danger"
        ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold transition ${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

export default function SessionWinnerPhotoCard({
  saving,
  photoBusy,
  canUploadWinnerPhoto,
  winnerPhotoUrl,
  hasWinnerPhoto,
  winnerPhotoInputRef,
  onWinnerPhotoUpload,
  onWinnerPhotoDelete,
  title = "Siegerfoto",
  collapsed,
  onToggleCollapsed,
}: SessionWinnerPhotoCardProps) {
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [masterPreviewUrl, setMasterPreviewUrl] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (!masterPreviewUrl) return;
    return () => URL.revokeObjectURL(masterPreviewUrl);
  }, [masterPreviewUrl]);

  function clearPreparedPhoto() {
    setMasterFile(null);
    setMasterPreviewUrl(null);
    setPreparing(false);
    setLocalBusy(false);
    setPhotoError(null);
  }

  function triggerFilePicker() {
    winnerPhotoInputRef.current?.click();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Bitte ein Bild auswählen.");
      return;
    }

    if (file.size > MAX_SOURCE_FILE_SIZE_BYTES) {
      setPhotoError("Das Originalbild ist zu groß. Bitte maximal 20 MB verwenden.");
      return;
    }

    try {
      setPreparing(true);
      setPhotoError(null);

      const preparedFile = await compressImageFile(file, {
        maxWidth: MASTER_MAX_SIZE,
        maxHeight: MASTER_MAX_SIZE,
        quality: 0.84,
        outputType: "image/jpeg",
      });

      if (preparedFile.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
        setPhotoError(
          "Das Foto konnte nicht weit genug verkleinert werden. Bitte ein kleineres Bild wählen."
        );
        setMasterFile(null);
        setMasterPreviewUrl(null);
        return;
      }

      setMasterFile(preparedFile);
      setMasterPreviewUrl(URL.createObjectURL(preparedFile));
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? error.message
          : "Das Foto konnte nicht vorbereitet werden."
      );
    } finally {
      setPreparing(false);
    }
  }

  async function usePreparedPhoto() {
    if (!masterFile || localBusy || photoBusy || saving) return;

    try {
      setLocalBusy(true);
      setPhotoError(null);

      const syntheticEvent = {
        target: {
          files: [masterFile],
          value: "",
        },
      } as unknown as ChangeEvent<HTMLInputElement>;

      await Promise.resolve(onWinnerPhotoUpload(syntheticEvent));
      clearPreparedPhoto();
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : "Das Foto konnte nicht gespeichert werden."
      );
      setLocalBusy(false);
    }
  }

  const done = hasWinnerPhoto;
  const controlsBusy = photoBusy || saving || preparing || localBusy;

  if (collapsed) {
    return (
      <section className="rounded-[20px] border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={`flex w-full items-center justify-between gap-4 rounded-[20px] px-4 py-3.5 text-left transition ${
            done ? "bg-emerald-50" : "hover:bg-slate-50/70"
          }`}
        >
          <div className="flex items-center gap-3">
            {done ? (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
                ✓
              </span>
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                3
              </span>
            )}

            <div>
              <div className="text-sm font-bold text-slate-950">
                {done ? "Siegerfoto übernommen" : title}
              </div>
              <SummaryPill tone={done ? "success" : "muted"}>
                {done ? "Foto vorhanden" : "Optional"}
              </SummaryPill>
            </div>
          </div>

          <div className="rounded-full border px-4 py-2 text-sm font-semibold">
            Bearbeiten
          </div>
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-[20px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
            3
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <SummaryPill tone={done ? "success" : "muted"}>
              {done ? "Foto vorhanden" : "Optional"}
            </SummaryPill>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className="rounded-full border px-4 py-2 text-sm font-semibold"
        >
          {done ? "Foto übernehmen" : "Ohne Foto weiter"}
        </button>
      </div>

      <div className="space-y-3 px-4 pb-4">
        <input
          ref={winnerPhotoInputRef}
          type="file"
          accept="image/*"
          onChange={(event) => void handleFileChange(event)}
          disabled={!canUploadWinnerPhoto || controlsBusy}
          className="hidden"
        />

        <div className="flex flex-wrap gap-2">
          <ControlButton
            onClick={triggerFilePicker}
            disabled={!canUploadWinnerPhoto || controlsBusy}
            tone="primary"
          >
            {preparing
              ? "Bild wird optimiert..."
              : photoBusy || localBusy
                ? "Speichert..."
                : done
                  ? "Foto ersetzen"
                  : masterFile
                    ? "Anderes Foto"
                    : "Foto auswählen"}
          </ControlButton>

          {done && !masterFile ? (
            <ControlButton
              onClick={onWinnerPhotoDelete}
              disabled={controlsBusy}
              tone="danger"
            >
              Löschen
            </ControlButton>
          ) : null}
        </div>

        {masterPreviewUrl ? (
          <div className="space-y-3 rounded-[20px] border border-slate-200 bg-slate-50 p-3">
            <div>
              <div className="text-sm font-bold text-slate-950">Foto prüfen</div>
              <div className="mt-1 text-xs leading-5 text-slate-600">
                Das vollständige Foto wird als Master gespeichert. Die SiegerCard wählt daraus später passend zu ihrem Layout den sichtbaren Ausschnitt.
              </div>
            </div>

            <div className="mx-auto flex max-h-[420px] w-full max-w-[420px] items-center justify-center overflow-hidden rounded-[18px] bg-slate-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={masterPreviewUrl}
                alt="Siegerfoto Vorschau"
                className="max-h-[420px] h-auto w-auto max-w-full object-contain"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <ControlButton
                onClick={() => void usePreparedPhoto()}
                disabled={controlsBusy}
                tone="primary"
              >
                {photoBusy || localBusy ? "Speichert..." : "✓ Foto verwenden"}
              </ControlButton>

              <ControlButton onClick={clearPreparedPhoto} disabled={controlsBusy}>
                Abbrechen
              </ControlButton>
            </div>
          </div>
        ) : (
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
            {winnerPhotoUrl ? (
              <div className="relative mx-auto aspect-[4/5] w-full max-w-[280px] overflow-hidden rounded-[16px]">
                <Image
                  src={winnerPhotoUrl}
                  alt="Siegerfoto"
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex min-h-[150px] flex-col items-center justify-center text-center text-xs text-slate-500">
                Noch kein Foto
              </div>
            )}
          </div>
        )}

        {photoError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {photoError}
          </div>
        ) : null}
      </div>
    </section>
  );
}
