"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
  WheelEvent as ReactWheelEvent,
} from "react";
import { compressImageFile } from "@/lib/client-images/compress-image";

const CROP_ASPECT = 4 / 5;
const CROP_OUTPUT_WIDTH = 1080;
const CROP_OUTPUT_HEIGHT = 1350;
const CROP_WORKING_MAX_SIZE = 2400;
const MAX_SOURCE_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_ZOOM = 4;

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Point = {
  x: number;
  y: number;
};

type Gesture =
  | {
      mode: "drag";
      pointerId: number;
      startPoint: Point;
      startCrop: CropRect;
    }
  | {
      mode: "pinch";
      pointerIds: [number, number];
      startDistance: number;
      startMidpoint: Point;
      startCrop: CropRect;
      startZoom: number;
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

function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
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

function cropForZoom(
  image: HTMLImageElement,
  zoom: number,
  centerX: number,
  centerY: number
): CropRect {
  const base = getInitialCropRect(image);
  const width = base.width / zoom;
  const height = base.height / zoom;

  return {
    x: clamp(centerX - width / 2, 0, image.naturalWidth - width),
    y: clamp(centerY - height / 2, 0, image.naturalHeight - height),
    width,
    height,
  };
}

function clampCropPosition(
  crop: CropRect,
  imageWidth: number,
  imageHeight: number
): CropRect {
  return {
    ...crop,
    x: clamp(crop.x, 0, Math.max(0, imageWidth - crop.width)),
    y: clamp(crop.y, 0, Math.max(0, imageHeight - crop.height)),
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
      0.88
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
  const cropRectRef = useRef<CropRect | null>(null);
  const activePointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<Gesture | null>(null);

  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [zoom, setZoom] = useState(1);
  const [cropBusy, setCropBusy] = useState(false);
  const [cropPreparing, setCropPreparing] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);

  useEffect(() => {
    if (!cropSourceUrl) return;

    return () => {
      URL.revokeObjectURL(cropSourceUrl);
    };
  }, [cropSourceUrl]);

  function applyCropRect(next: CropRect) {
    cropRectRef.current = next;
    setCropRect(next);
  }

  function clearCropSelection() {
    activePointersRef.current.clear();
    gestureRef.current = null;
    cropRectRef.current = null;
    setCropFile(null);
    setCropSourceUrl(null);
    setCropRect(null);
    setZoom(1);
    setCropBusy(false);
    setCropPreparing(false);
    setCropError(null);
  }

  function resetCrop() {
    const image = cropImageRef.current;
    if (!image) return;

    setZoom(1);
    applyCropRect(getInitialCropRect(image));
  }

  function adjustZoom(nextZoomValue: number) {
    const image = cropImageRef.current;
    const current = cropRectRef.current;
    if (!image || !current) return;

    const nextZoom = clamp(nextZoomValue, 1, MAX_ZOOM);
    const centerX = current.x + current.width / 2;
    const centerY = current.y + current.height / 2;

    setZoom(nextZoom);
    applyCropRect(cropForZoom(image, nextZoom, centerX, centerY));
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setCropError("Bitte ein Bild auswählen.");
      return;
    }

    if (file.size > MAX_SOURCE_FILE_SIZE_BYTES) {
      setCropError("Das Originalbild ist zu groß. Bitte maximal 20 MB verwenden.");
      return;
    }

    try {
      setCropPreparing(true);
      setCropError(null);
      cropRectRef.current = null;
      setCropRect(null);
      setZoom(1);

      const preparedFile = await compressImageFile(file, {
        maxWidth: CROP_WORKING_MAX_SIZE,
        maxHeight: CROP_WORKING_MAX_SIZE,
        quality: 0.82,
        outputType: "image/jpeg",
      });

      const nextUrl = URL.createObjectURL(preparedFile);
      setCropFile(preparedFile);
      setCropSourceUrl(nextUrl);
    } catch (error) {
      setCropError(
        error instanceof Error
          ? error.message
          : "Das Bild konnte nicht für den Zuschnitt vorbereitet werden."
      );
    } finally {
      setCropPreparing(false);
    }
  }

  function triggerFilePicker() {
    winnerPhotoInputRef.current?.click();
  }

  function handleCropImageLoad() {
    const image = cropImageRef.current;
    if (!image) return;

    setZoom(1);
    applyCropRect(getInitialCropRect(image));
    setCropError(null);
  }

  function handleCropImageError() {
    cropRectRef.current = null;
    setCropRect(null);
    setCropError(
      "Das Foto kann in diesem Browser nicht zugeschnitten werden. Bitte ein anderes Bild versuchen."
    );
  }

  function beginGestureFromPointers() {
    const currentCrop = cropRectRef.current;
    if (!currentCrop) return;

    const entries = Array.from(activePointersRef.current.entries());

    if (entries.length >= 2) {
      const [first, second] = entries;
      gestureRef.current = {
        mode: "pinch",
        pointerIds: [first[0], second[0]],
        startDistance: Math.max(1, distance(first[1], second[1])),
        startMidpoint: midpoint(first[1], second[1]),
        startCrop: currentCrop,
        startZoom: zoom,
      };
      return;
    }

    if (entries.length === 1) {
      gestureRef.current = {
        mode: "drag",
        pointerId: entries[0][0],
        startPoint: entries[0][1],
        startCrop: currentCrop,
      };
      return;
    }

    gestureRef.current = null;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!cropRectRef.current || cropBusy || cropPreparing || photoBusy) return;

    event.preventDefault();
    cropWorkspaceRef.current?.setPointerCapture(event.pointerId);
    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    beginGestureFromPointers();
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const image = cropImageRef.current;
    const workspace = cropWorkspaceRef.current;
    const gesture = gestureRef.current;

    if (
      !image ||
      !workspace ||
      !gesture ||
      !activePointersRef.current.has(event.pointerId)
    ) {
      return;
    }

    event.preventDefault();
    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const bounds = workspace.getBoundingClientRect();
    if (!bounds.width) return;

    if (gesture.mode === "drag") {
      const pointer = activePointersRef.current.get(gesture.pointerId);
      if (!pointer) return;

      const scale = bounds.width / gesture.startCrop.width;
      const dx = (pointer.x - gesture.startPoint.x) / scale;
      const dy = (pointer.y - gesture.startPoint.y) / scale;

      applyCropRect(
        clampCropPosition(
          {
            ...gesture.startCrop,
            x: gesture.startCrop.x - dx,
            y: gesture.startCrop.y - dy,
          },
          image.naturalWidth,
          image.naturalHeight
        )
      );
      return;
    }

    const first = activePointersRef.current.get(gesture.pointerIds[0]);
    const second = activePointersRef.current.get(gesture.pointerIds[1]);
    if (!first || !second) return;

    const currentDistance = Math.max(1, distance(first, second));
    const ratio = currentDistance / gesture.startDistance;
    const nextZoom = clamp(gesture.startZoom * ratio, 1, MAX_ZOOM);
    const currentMidpoint = midpoint(first, second);
    const scale = bounds.width / gesture.startCrop.width;
    const midpointDx = (currentMidpoint.x - gesture.startMidpoint.x) / scale;
    const midpointDy = (currentMidpoint.y - gesture.startMidpoint.y) / scale;
    const centerX =
      gesture.startCrop.x + gesture.startCrop.width / 2 - midpointDx;
    const centerY =
      gesture.startCrop.y + gesture.startCrop.height / 2 - midpointDy;

    setZoom(nextZoom);
    applyCropRect(cropForZoom(image, nextZoom, centerX, centerY));
  }

  function finishPointer(event: ReactPointerEvent<HTMLDivElement>) {
    activePointersRef.current.delete(event.pointerId);

    if (cropWorkspaceRef.current?.hasPointerCapture(event.pointerId)) {
      cropWorkspaceRef.current.releasePointerCapture(event.pointerId);
    }

    beginGestureFromPointers();
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!cropRectRef.current || cropBusy || cropPreparing || photoBusy) return;

    event.preventDefault();
    const factor = Math.exp(-event.deltaY * 0.0015);
    adjustZoom(zoom * factor);
  }

  async function useCroppedPhoto() {
    const image = cropImageRef.current;
    const currentCrop = cropRectRef.current;

    if (!cropFile || !image || !currentCrop || cropBusy || cropPreparing || photoBusy) {
      return;
    }

    try {
      setCropBusy(true);
      setCropError(null);

      const croppedFile = await cropToJpegFile(image, cropFile, currentCrop);
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
  const controlsBusy = photoBusy || saving || cropBusy || cropPreparing;
  const cropReady = Boolean(cropRect && cropImageRef.current && !cropPreparing);

  useEffect(() => {
    if (!cropSourceUrl) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !controlsBusy) {
        event.preventDefault();
        clearCropSelection();
        return;
      }

      if (event.key !== "Enter" || !cropReady || controlsBusy || cropError) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target &&
        ["BUTTON", "INPUT", "TEXTAREA", "SELECT", "A"].includes(target.tagName)
      ) {
        return;
      }

      event.preventDefault();
      void useCroppedPhoto();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cropSourceUrl, cropReady, controlsBusy, cropError]);

  const cropImageStyle =
    cropRect && cropImageRef.current
      ? {
          width: `${(cropImageRef.current.naturalWidth / cropRect.width) * 100}%`,
          maxWidth: "none",
          left: `${-(cropRect.x / cropRect.width) * 100}%`,
          top: `${-(cropRect.y / cropRect.height) * 100}%`,
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
          onChange={(event) => {
            void handleFileChange(event);
          }}
          disabled={!canUploadWinnerPhoto || controlsBusy}
          className="hidden"
        />

        <div className="flex flex-wrap gap-2">
          <ControlButton
            onClick={triggerFilePicker}
            disabled={!canUploadWinnerPhoto || controlsBusy}
            tone="primary"
          >
            {cropPreparing
              ? "Bild wird optimiert..."
              : photoBusy
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
                Ziehe das Bild unter dem festen 4:5-Rahmen. Mit zwei Fingern oder dem Mausrad kannst du zoomen.
              </div>
            </div>

            <div className="mx-auto w-full max-w-[420px]">
              <div
                ref={cropWorkspaceRef}
                className="relative aspect-[4/5] w-full cursor-grab overflow-hidden rounded-[18px] bg-slate-950 shadow-inner select-none active:cursor-grabbing"
                style={{ touchAction: "none" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishPointer}
                onPointerCancel={finishPointer}
                onWheel={handleWheel}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={cropImageRef}
                  src={cropSourceUrl}
                  alt="Siegerfoto ausrichten"
                  draggable={false}
                  onLoad={handleCropImageLoad}
                  onError={handleCropImageError}
                  className="pointer-events-none absolute h-auto select-none"
                  style={cropImageStyle}
                />

                <div className="pointer-events-none absolute inset-0 z-20 border-2 border-white/90">
                  <div className="absolute inset-x-0 top-1/3 border-t border-white/45" />
                  <div className="absolute inset-x-0 top-2/3 border-t border-white/45" />
                  <div className="absolute inset-y-0 left-1/3 border-l border-white/45" />
                  <div className="absolute inset-y-0 left-2/3 border-l border-white/45" />
                </div>

                {cropReady ? (
                  <button
                    type="button"
                    aria-label="Ausschnitt verwenden"
                    title="Ausschnitt verwenden"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => {
                      void useCroppedPhoto();
                    }}
                    disabled={controlsBusy || Boolean(cropError)}
                    className="absolute bottom-3 right-3 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-slate-950/90 text-xl font-black text-white shadow-lg backdrop-blur transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cropBusy || photoBusy ? "…" : "✓"}
                  </button>
                ) : null}
              </div>

              <div className="mt-3 flex items-center justify-center gap-2">
                <ControlButton
                  onClick={() => adjustZoom(zoom / 1.2)}
                  disabled={!cropReady || controlsBusy || zoom <= 1}
                >
                  −
                </ControlButton>
                <div className="min-w-20 text-center text-[11px] font-semibold text-slate-500">
                  Zoom {Math.round(zoom * 100)} %
                </div>
                <ControlButton
                  onClick={() => adjustZoom(zoom * 1.2)}
                  disabled={!cropReady || controlsBusy || zoom >= MAX_ZOOM}
                >
                  +
                </ControlButton>
              </div>
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
                {cropBusy || photoBusy ? "Speichert..." : "✓ Foto verwenden"}
              </ControlButton>

              <ControlButton onClick={resetCrop} disabled={!cropReady || controlsBusy}>
                Zurücksetzen
              </ControlButton>

              <ControlButton onClick={clearCropSelection} disabled={controlsBusy}>
                Abbrechen
              </ControlButton>
            </div>

            <div className="text-[11px] font-medium text-slate-500">
              Desktop: Bild ziehen · Mausrad = Zoom · Enter = verwenden · Esc = abbrechen
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
      </div>
    </section>
  );
}
