"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, RefObject } from "react";

const CROP_PREVIEW_WIDTH = 432;
const CROP_PREVIEW_HEIGHT = 540;
const CROP_OUTPUT_WIDTH = 1080;
const CROP_OUTPUT_HEIGHT = 1350;

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

function drawCrop(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  zoom: number,
  positionX: number,
  positionY: number
) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const targetWidth = canvas.width;
  const targetHeight = canvas.height;
  const imageWidth = image.naturalWidth;
  const imageHeight = image.naturalHeight;

  if (!imageWidth || !imageHeight) return;

  const coverScale = Math.max(
    targetWidth / imageWidth,
    targetHeight / imageHeight
  );
  const scale = coverScale * zoom;
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const overflowX = Math.max(0, drawWidth - targetWidth);
  const overflowY = Math.max(0, drawHeight - targetHeight);
  const drawX = -overflowX * (positionX / 100);
  const drawY = -overflowY * (positionY / 100);

  context.clearRect(0, 0, targetWidth, targetHeight);
  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

async function canvasToJpegFile(
  image: HTMLImageElement,
  originalFile: File,
  zoom: number,
  positionX: number,
  positionY: number
) {
  const canvas = document.createElement("canvas");
  canvas.width = CROP_OUTPUT_WIDTH;
  canvas.height = CROP_OUTPUT_HEIGHT;
  drawCrop(canvas, image, zoom, positionX, positionY);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (nextBlob) {
          resolve(nextBlob);
        } else {
          reject(new Error("Das zugeschnittene Bild konnte nicht erstellt werden."));
        }
      },
      "image/jpeg",
      0.9
    );
  });

  const baseName = originalFile.name.replace(/\.[^.]+$/, "") || "siegerfoto";

  return new File([blob], `${baseName}-crop.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export default function SessionWinnerPhotoCard({
  hasResult,
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
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [cropReady, setCropReady] = useState(false);
  const [cropBusy, setCropBusy] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(50);
  const [positionY, setPositionY] = useState(50);

  useEffect(() => {
    if (!cropSourceUrl) {
      cropImageRef.current = null;
      setCropReady(false);
      return;
    }

    const image = new window.Image();
    let cancelled = false;

    image.onload = () => {
      if (cancelled) return;
      cropImageRef.current = image;
      setCropReady(true);
      setCropError(null);
    };

    image.onerror = () => {
      if (cancelled) return;
      cropImageRef.current = null;
      setCropReady(false);
      setCropError(
        "Das Foto kann in diesem Browser nicht zugeschnitten werden. Bitte ein anderes Bild versuchen."
      );
    };

    image.src = cropSourceUrl;

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [cropSourceUrl]);

  useEffect(() => {
    const canvas = cropCanvasRef.current;
    const image = cropImageRef.current;

    if (!canvas || !image || !cropReady) return;

    drawCrop(canvas, image, zoom, positionX, positionY);
  }, [cropReady, zoom, positionX, positionY]);

  useEffect(() => {
    if (!cropSourceUrl) return;

    return () => {
      URL.revokeObjectURL(cropSourceUrl);
    };
  }, [cropSourceUrl]);

  function resetCrop() {
    setCropFile(null);
    setCropSourceUrl(null);
    setCropReady(false);
    setCropBusy(false);
    setCropError(null);
    setZoom(1);
    setPositionX(50);
    setPositionY(50);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setCropError("Bitte ein Bild auswählen.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setCropError("Das Bild ist zu groß. Bitte maximal 10 MB verwenden.");
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setCropFile(file);
    setCropSourceUrl(nextUrl);
    setCropReady(false);
    setCropError(null);
    setZoom(1);
    setPositionX(50);
    setPositionY(50);
  }

  function triggerFilePicker() {
    winnerPhotoInputRef.current?.click();
  }

  async function useCroppedPhoto() {
    const image = cropImageRef.current;

    if (!cropFile || !image || !cropReady || cropBusy || photoBusy) {
      return;
    }

    try {
      setCropBusy(true);
      setCropError(null);

      const croppedFile = await canvasToJpegFile(
        image,
        cropFile,
        zoom,
        positionX,
        positionY
      );

      const syntheticEvent = {
        target: {
          files: [croppedFile],
          value: "",
        },
      } as unknown as ChangeEvent<HTMLInputElement>;

      resetCrop();
      await Promise.resolve(onWinnerPhotoUpload(syntheticEvent));
    } catch (error) {
      setCropError(
        error instanceof Error
          ? error.message
          : "Das zugeschnittene Foto konnte nicht vorbereitet werden."
      );
      setCropBusy(false);
    }
  }

  const done = hasWinnerPhoto;
  const controlsBusy = photoBusy || saving || cropBusy;

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
          onChange={handleFileChange}
          disabled={!canUploadWinnerPhoto || controlsBusy}
          className="hidden"
        />

        <div className="flex gap-2">
          <ControlButton
            onClick={triggerFilePicker}
            disabled={!canUploadWinnerPhoto || controlsBusy}
            tone="primary"
          >
            {photoBusy
              ? "Speichert..."
              : done
                ? "Foto ersetzen"
                : cropSourceUrl
                  ? "Anderes Foto"
                  : "Foto auswählen"}
          </ControlButton>

          {done && !cropSourceUrl ? (
            <ControlButton
              onClick={onWinnerPhotoDelete}
              disabled={controlsBusy}
              tone="danger"
            >
              Löschen
            </ControlButton>
          ) : null}
        </div>

        {cropSourceUrl ? (
          <div className="space-y-4 rounded-[20px] border border-slate-200 bg-slate-50 p-3">
            <div>
              <div className="text-sm font-bold text-slate-950">Foto ausrichten</div>
              <div className="mt-1 text-xs leading-5 text-slate-600">
                Der sichtbare 4:5-Ausschnitt wird später als Siegerfoto gespeichert.
              </div>
            </div>

            <div className="overflow-hidden rounded-[18px] bg-slate-950 shadow-inner">
              <canvas
                ref={cropCanvasRef}
                width={CROP_PREVIEW_WIDTH}
                height={CROP_PREVIEW_HEIGHT}
                className="block aspect-[4/5] w-full"
              />
            </div>

            {!cropReady && !cropError ? (
              <div className="text-xs font-medium text-slate-500">
                Vorschau wird vorbereitet...
              </div>
            ) : null}

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Zoom
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  disabled={!cropReady || controlsBusy}
                  className="mt-1 w-full"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-700">
                Links ↔ rechts
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={positionX}
                  onChange={(event) => setPositionX(Number(event.target.value))}
                  disabled={!cropReady || controlsBusy}
                  className="mt-1 w-full"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-700">
                Oben ↕ unten
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={positionY}
                  onChange={(event) => setPositionY(Number(event.target.value))}
                  disabled={!cropReady || controlsBusy}
                  className="mt-1 w-full"
                />
              </label>
            </div>

            {cropError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {cropError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <ControlButton
                onClick={() => {
                  void useCroppedPhoto();
                }}
                disabled={!cropReady || controlsBusy || Boolean(cropError)}
                tone="primary"
              >
                {cropBusy || photoBusy ? "Speichert..." : "Foto verwenden"}
              </ControlButton>

              <ControlButton onClick={resetCrop} disabled={controlsBusy}>
                Abbrechen
              </ControlButton>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50">
            {winnerPhotoUrl ? (
              <div className="relative aspect-[4/5] w-full">
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
      </div>
    </section>
  );
}
