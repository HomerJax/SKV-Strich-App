"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";

const CROP_ASPECT = 4 / 5;
const CROP_OUTPUT_WIDTH = 1080;
const CROP_OUTPUT_HEIGHT = 1350;

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CropMode = "move" | "n" | "e" | "s" | "w" | "nw" | "ne" | "se" | "sw";

type CropInteraction = {
  mode: CropMode;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startRect: CropRect;
};

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getInitialCropRect(image: HTMLImageElement): CropRect {
  const imageWidth = image.naturalWidth;
  const imageHeight = image.naturalHeight;

  if (!imageWidth || !imageHeight) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  if (imageWidth / imageHeight >= CROP_ASPECT) {
    const height = imageHeight;
    const width = height * CROP_ASPECT;
    return {
      x: (imageWidth - width) / 2,
      y: 0,
      width,
      height,
    };
  }

  const width = imageWidth;
  const height = width / CROP_ASPECT;

  return {
    x: 0,
    y: (imageHeight - height) / 2,
    width,
    height,
  };
}

async function cropToJpegFile(
  image: HTMLImageElement,
  originalFile: File,
  crop: CropRect
) {
  const canvas = document.createElement("canvas");
  canvas.width = CROP_OUTPUT_WIDTH;
  canvas.height = CROP_OUTPUT_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Das zugeschnittene Bild konnte nicht erstellt werden.");
  }

  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    CROP_OUTPUT_WIDTH,
    CROP_OUTPUT_HEIGHT
  );

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
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const cropWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<CropInteraction | null>(null);

  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [cropBusy, setCropBusy] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);

  useEffect(() => {
    if (!cropSourceUrl) return;

    return () => {
      URL.revokeObjectURL(cropSourceUrl);
    };
  }, [cropSourceUrl]);

  function clearCropSelection() {
    interactionRef.current = null;
    setCropFile(null);
    setCropSourceUrl(null);
    setCropRect(null);
    setCropBusy(false);
    setCropError(null);
  }

  function resetCropRect() {
    const image = cropImageRef.current;
    if (!image) return;
    setCropRect(getInitialCropRect(image));
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
    setCropRect(null);
    setCropError(null);
  }

  function triggerFilePicker() {
    winnerPhotoInputRef.current?.click();
  }

  function handleCropImageLoad() {
    const image = cropImageRef.current;
    if (!image) return;

    setCropRect(getInitialCropRect(image));
    setCropError(null);
  }

  function handleCropImageError() {
    setCropRect(null);
    setCropError(
      "Das Foto kann in diesem Browser nicht zugeschnitten werden. Bitte ein anderes Bild versuchen."
    );
  }

  function startInteraction(mode: CropMode, event: ReactPointerEvent<HTMLElement>) {
    if (!cropRect || cropBusy || photoBusy) return;

    event.preventDefault();
    event.stopPropagation();

    cropWorkspaceRef.current?.setPointerCapture(event.pointerId);
    interactionRef.current = {
      mode,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect: cropRect,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const interaction = interactionRef.current;
    const image = cropImageRef.current;

    if (!interaction || !image || interaction.pointerId !== event.pointerId) return;

    event.preventDefault();

    const imageBounds = image.getBoundingClientRect();
    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;

    if (!imageBounds.width || !imageBounds.height || !imageWidth || !imageHeight) {
      return;
    }

    const start = interaction.startRect;
    const toNaturalX = imageWidth / imageBounds.width;
    const toNaturalY = imageHeight / imageBounds.height;
    const dx = (event.clientX - interaction.startClientX) * toNaturalX;
    const dy = (event.clientY - interaction.startClientY) * toNaturalY;

    if (interaction.mode === "move") {
      setCropRect({
        ...start,
        x: clamp(start.x + dx, 0, imageWidth - start.width),
        y: clamp(start.y + dy, 0, imageHeight - start.height),
      });
      return;
    }

    const pointerX = clamp(
      (event.clientX - imageBounds.left) * toNaturalX,
      0,
      imageWidth
    );
    const pointerY = clamp(
      (event.clientY - imageBounds.top) * toNaturalY,
      0,
      imageHeight
    );

    const minWidthBase = Math.max(80, imageWidth * 0.15);

    if (
      interaction.mode === "nw" ||
      interaction.mode === "ne" ||
      interaction.mode === "se" ||
      interaction.mode === "sw"
    ) {
      const leftSide = interaction.mode === "nw" || interaction.mode === "sw";
      const topSide = interaction.mode === "nw" || interaction.mode === "ne";
      const anchorX = leftSide ? start.x + start.width : start.x;
      const anchorY = topSide ? start.y + start.height : start.y;

      const widthFromX = leftSide ? anchorX - pointerX : pointerX - anchorX;
      const widthFromY =
        (topSide ? anchorY - pointerY : pointerY - anchorY) * CROP_ASPECT;

      const deltaFromX = Math.abs(widthFromX - start.width);
      const deltaFromY = Math.abs(widthFromY - start.width);
      const requestedWidth = deltaFromX >= deltaFromY ? widthFromX : widthFromY;

      const horizontalCapacity = leftSide ? anchorX : imageWidth - anchorX;
      const verticalCapacity = topSide ? anchorY : imageHeight - anchorY;
      const maxWidth = Math.max(
        1,
        Math.min(horizontalCapacity, verticalCapacity * CROP_ASPECT)
      );
      const minWidth = Math.min(minWidthBase, maxWidth);
      const width = clamp(requestedWidth, minWidth, maxWidth);
      const height = width / CROP_ASPECT;

      setCropRect({
        x: leftSide ? anchorX - width : anchorX,
        y: topSide ? anchorY - height : anchorY,
        width,
        height,
      });
      return;
    }

    if (interaction.mode === "e" || interaction.mode === "w") {
      const leftSide = interaction.mode === "w";
      const anchorX = leftSide ? start.x + start.width : start.x;
      const centerY = start.y + start.height / 2;
      const requestedWidth = leftSide ? anchorX - pointerX : pointerX - anchorX;
      const horizontalCapacity = leftSide ? anchorX : imageWidth - anchorX;
      const verticalHalfCapacity = Math.min(centerY, imageHeight - centerY);
      const maxWidth = Math.max(
        1,
        Math.min(horizontalCapacity, verticalHalfCapacity * 2 * CROP_ASPECT)
      );
      const minWidth = Math.min(minWidthBase, maxWidth);
      const width = clamp(requestedWidth, minWidth, maxWidth);
      const height = width / CROP_ASPECT;

      setCropRect({
        x: leftSide ? anchorX - width : anchorX,
        y: centerY - height / 2,
        width,
        height,
      });
      return;
    }

    const topSide = interaction.mode === "n";
    const anchorY = topSide ? start.y + start.height : start.y;
    const centerX = start.x + start.width / 2;
    const requestedHeight = topSide ? anchorY - pointerY : pointerY - anchorY;
    const verticalCapacity = topSide ? anchorY : imageHeight - anchorY;
    const horizontalHalfCapacity = Math.min(centerX, imageWidth - centerX);
    const maxHeight = Math.max(
      1,
      Math.min(verticalCapacity, (horizontalHalfCapacity * 2) / CROP_ASPECT)
    );
    const minHeight = Math.min(minWidthBase / CROP_ASPECT, maxHeight);
    const height = clamp(requestedHeight, minHeight, maxHeight);
    const width = height * CROP_ASPECT;

    setCropRect({
      x: centerX - width / 2,
      y: topSide ? anchorY - height : anchorY,
      width,
      height,
    });
  }

  function finishInteraction(event: ReactPointerEvent<HTMLDivElement>) {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;

    interactionRef.current = null;

    if (cropWorkspaceRef.current?.hasPointerCapture(event.pointerId)) {
      cropWorkspaceRef.current.releasePointerCapture(event.pointerId);
    }
  }

  async function useCroppedPhoto() {
    const image = cropImageRef.current;

    if (!cropFile || !image || !cropRect || cropBusy || photoBusy) {
      return;
    }

    try {
      setCropBusy(true);
      setCropError(null);

      const croppedFile = await cropToJpegFile(image, cropFile, cropRect);
      const syntheticEvent = {
        target: {
          files: [croppedFile],
          value: "",
        },
      } as unknown as ChangeEvent<HTMLInputElement>;

      await Promise.resolve(onWinnerPhotoUpload(syntheticEvent));
      clearCropSelection();
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
  const cropReady = Boolean(cropRect && cropImageRef.current);

  const cropStyle = cropRect && cropImageRef.current
    ? {
        left: `${(cropRect.x / cropImageRef.current.naturalWidth) * 100}%`,
        top: `${(cropRect.y / cropImageRef.current.naturalHeight) * 100}%`,
        width: `${(cropRect.width / cropImageRef.current.naturalWidth) * 100}%`,
        height: `${(cropRect.height / cropImageRef.current.naturalHeight) * 100}%`,
      }
    : undefined;

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

        <div className="flex flex-wrap gap-2">
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
              <div className="text-sm font-bold text-slate-950">Foto zuschneiden</div>
              <div className="mt-1 text-xs leading-5 text-slate-600">
                Ziehe den Rahmen oder seine Seiten und Ecken direkt im Bild. Der Ausschnitt bleibt im 4:5-Format für die SiegerCard.
              </div>
            </div>

            <div
              ref={cropWorkspaceRef}
              className="relative overflow-hidden rounded-[18px] bg-slate-950 shadow-inner select-none"
              style={{ touchAction: "none" }}
              onPointerMove={handlePointerMove}
              onPointerUp={finishInteraction}
              onPointerCancel={finishInteraction}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={cropImageRef}
                src={cropSourceUrl}
                alt="Siegerfoto zuschneiden"
                draggable={false}
                onLoad={handleCropImageLoad}
                onError={handleCropImageError}
                className="block h-auto w-full select-none"
              />

              {cropStyle ? (
                <div
                  className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(15,23,42,0.62)]"
                  style={cropStyle}
                  onPointerDown={(event) => startInteraction("move", event)}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-white/50" />
                  <div className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-white/50" />
                  <div className="pointer-events-none absolute inset-y-0 left-1/3 border-l border-white/50" />
                  <div className="pointer-events-none absolute inset-y-0 left-2/3 border-l border-white/50" />

                  <button
                    type="button"
                    aria-label="Obere Kante ziehen"
                    onPointerDown={(event) => startInteraction("n", event)}
                    className="absolute -top-3 left-1/2 h-6 w-14 -translate-x-1/2 cursor-ns-resize touch-none bg-transparent"
                  >
                    <span className="absolute left-1/2 top-2.5 h-1 w-10 -translate-x-1/2 rounded-full bg-white shadow" />
                  </button>
                  <button
                    type="button"
                    aria-label="Untere Kante ziehen"
                    onPointerDown={(event) => startInteraction("s", event)}
                    className="absolute -bottom-3 left-1/2 h-6 w-14 -translate-x-1/2 cursor-ns-resize touch-none bg-transparent"
                  >
                    <span className="absolute bottom-2.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-white shadow" />
                  </button>
                  <button
                    type="button"
                    aria-label="Linke Kante ziehen"
                    onPointerDown={(event) => startInteraction("w", event)}
                    className="absolute -left-3 top-1/2 h-14 w-6 -translate-y-1/2 cursor-ew-resize touch-none bg-transparent"
                  >
                    <span className="absolute left-2.5 top-1/2 h-10 w-1 -translate-y-1/2 rounded-full bg-white shadow" />
                  </button>
                  <button
                    type="button"
                    aria-label="Rechte Kante ziehen"
                    onPointerDown={(event) => startInteraction("e", event)}
                    className="absolute -right-3 top-1/2 h-14 w-6 -translate-y-1/2 cursor-ew-resize touch-none bg-transparent"
                  >
                    <span className="absolute right-2.5 top-1/2 h-10 w-1 -translate-y-1/2 rounded-full bg-white shadow" />
                  </button>

                  {(["nw", "ne", "se", "sw"] as const).map((mode) => {
                    const positionClass =
                      mode === "nw"
                        ? "-left-3 -top-3 cursor-nwse-resize"
                        : mode === "ne"
                          ? "-right-3 -top-3 cursor-nesw-resize"
                          : mode === "se"
                            ? "-bottom-3 -right-3 cursor-nwse-resize"
                            : "-bottom-3 -left-3 cursor-nesw-resize";

                    return (
                      <button
                        key={mode}
                        type="button"
                        aria-label="Ecke des Ausschnitts ziehen"
                        onPointerDown={(event) => startInteraction(mode, event)}
                        className={`absolute h-7 w-7 touch-none rounded-full border-2 border-slate-900 bg-white shadow-md ${positionClass}`}
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>

            {!cropReady && !cropError ? (
              <div className="text-xs font-medium text-slate-500">
                Vorschau wird vorbereitet...
              </div>
            ) : null}

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

              <ControlButton
                onClick={resetCropRect}
                disabled={!cropReady || controlsBusy}
              >
                Zurücksetzen
              </ControlButton>

              <ControlButton onClick={clearCropSelection} disabled={controlsBusy}>
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
