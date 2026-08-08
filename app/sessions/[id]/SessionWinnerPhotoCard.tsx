"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";
import { compressImageFile } from "@/lib/client-images/compress-image";

const MASTER_MAX_SIZE = 2400;
const MAX_SOURCE_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MIN_FOCUS_ZOOM = 0.75;
const MAX_FOCUS_ZOOM = 2.5;
const MAX_COMBINED_TRIM = 60;

type PhotoFocus = { x: number; y: number; zoom: number };
type PhotoTrim = { top: number; right: number; bottom: number; left: number };
type CropHandle = "top" | "right" | "bottom" | "left";

type SessionWinnerPhotoCardProps = {
  sessionId: number;
  hasResult: boolean;
  saving: boolean;
  photoBusy: boolean;
  canUploadWinnerPhoto: boolean;
  winnerPhotoUrl: string | null;
  hasWinnerPhoto: boolean;
  winnerPhotoInputRef: RefObject<HTMLInputElement | null>;
  onWinnerPhotoUpload: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onWinnerPhotoDelete: () => void;
  title?: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

const EMPTY_TRIM: PhotoTrim = { top: 0, right: 0, bottom: 0, left: 0 };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function SummaryPill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "success" | "muted" }) {
  const className =
    tone === "success"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "muted"
        ? "bg-slate-100 text-slate-600"
        : "bg-white text-slate-700 ring-1 ring-slate-200";
  return <div className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}>{children}</div>;
}

function ControlButton({ children, onClick, disabled = false, tone = "default" }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; tone?: "default" | "primary" | "danger" }) {
  const className =
    tone === "primary"
      ? "bg-slate-950 text-white hover:bg-slate-800"
      : tone === "danger"
        ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold transition ${className} disabled:cursor-not-allowed disabled:opacity-60`}>
      {children}
    </button>
  );
}

function cropImageFile(file: File, trim: PhotoTrim): Promise<File> {
  if (!trim.top && !trim.right && !trim.bottom && !trim.left) return Promise.resolve(file);

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      try {
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        const sourceX = Math.round(width * (trim.left / 100));
        const sourceY = Math.round(height * (trim.top / 100));
        const sourceWidth = Math.max(1, Math.round(width * (1 - (trim.left + trim.right) / 100)));
        const sourceHeight = Math.max(1, Math.round(height * (1 - (trim.top + trim.bottom) / 100)));
        const canvas = document.createElement("canvas");
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Bild konnte nicht zugeschnitten werden.");

        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Bild konnte nicht zugeschnitten werden."));
            return;
          }
          const baseName = file.name.replace(/\.[^.]+$/, "") || "winner-photo";
          resolve(new File([blob], `${baseName}-crop.jpg`, { type: "image/jpeg", lastModified: Date.now() }));
        }, "image/jpeg", 0.9);
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Bild konnte nicht zugeschnitten werden."));
    };
    image.src = objectUrl;
  });
}

export default function SessionWinnerPhotoCard({
  sessionId,
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
  const focusWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const focusDragRef = useRef<{ pointerId: number; startClientX: number; startClientY: number; startFocus: PhotoFocus } | null>(null);
  const cropDragRef = useRef<{ pointerId: number; handle: CropHandle; startClientX: number; startClientY: number; startTrim: PhotoTrim } | null>(null);

  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [masterPreviewUrl, setMasterPreviewUrl] = useState<string | null>(null);
  const [previewAspectRatio, setPreviewAspectRatio] = useState(4 / 3);
  const [focus, setFocus] = useState<PhotoFocus>({ x: 0.5, y: 0.5, zoom: 1 });
  const [trim, setTrim] = useState<PhotoTrim>(EMPTY_TRIM);
  const [preparing, setPreparing] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (!masterPreviewUrl) return;
    return () => URL.revokeObjectURL(masterPreviewUrl);
  }, [masterPreviewUrl]);

  function clearPreparedPhoto() {
    focusDragRef.current = null;
    cropDragRef.current = null;
    setMasterFile(null);
    setMasterPreviewUrl(null);
    setPreviewAspectRatio(4 / 3);
    setFocus({ x: 0.5, y: 0.5, zoom: 1 });
    setTrim(EMPTY_TRIM);
    setPreparing(false);
    setLocalBusy(false);
    setPhotoError(null);
  }

  function resetFocus() {
    setFocus({ x: 0.5, y: 0.5, zoom: 1 });
    setTrim(EMPTY_TRIM);
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
      setFocus({ x: 0.5, y: 0.5, zoom: 1 });
      setTrim(EMPTY_TRIM);
      const preparedFile = await compressImageFile(file, {
        maxWidth: MASTER_MAX_SIZE,
        maxHeight: MASTER_MAX_SIZE,
        quality: 0.84,
        outputType: "image/jpeg",
      });
      if (preparedFile.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
        setPhotoError("Das Foto konnte nicht weit genug verkleinert werden. Bitte ein kleineres Bild wählen.");
        setMasterFile(null);
        setMasterPreviewUrl(null);
        return;
      }
      setMasterFile(preparedFile);
      setMasterPreviewUrl(URL.createObjectURL(preparedFile));
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Das Foto konnte nicht vorbereitet werden.");
    } finally {
      setPreparing(false);
    }
  }

  const controlsBusy = photoBusy || saving || preparing || localBusy;

  function handleFocusPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (controlsBusy || cropDragRef.current) return;
    const workspace = focusWorkspaceRef.current;
    if (!workspace) return;
    event.preventDefault();
    workspace.setPointerCapture(event.pointerId);
    focusDragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startFocus: focus,
    };
  }

  function handleFocusPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = focusDragRef.current;
    const workspace = focusWorkspaceRef.current;
    if (!drag || !workspace || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const bounds = workspace.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const dx = (event.clientX - drag.startClientX) / bounds.width;
    const dy = (event.clientY - drag.startClientY) / bounds.height;
    setFocus((current) => ({
      ...current,
      x: clamp(drag.startFocus.x - dx / Math.max(drag.startFocus.zoom, 0.75), 0, 1),
      y: clamp(drag.startFocus.y - dy / Math.max(drag.startFocus.zoom, 0.75), 0, 1),
    }));
  }

  function finishFocusPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const workspace = focusWorkspaceRef.current;
    if (workspace?.hasPointerCapture(event.pointerId)) workspace.releasePointerCapture(event.pointerId);
    focusDragRef.current = null;
  }

  function startCropDrag(event: ReactPointerEvent<HTMLDivElement>, handle: CropHandle) {
    if (controlsBusy) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    cropDragRef.current = {
      pointerId: event.pointerId,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startTrim: trim,
    };
  }

  function moveCropDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = cropDragRef.current;
    const workspace = focusWorkspaceRef.current;
    if (!drag || !workspace || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = workspace.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const dxPercent = ((event.clientX - drag.startClientX) / bounds.width) * 100;
    const dyPercent = ((event.clientY - drag.startClientY) / bounds.height) * 100;
    const next = { ...drag.startTrim };

    if (drag.handle === "top") {
      next.top = clamp(drag.startTrim.top + dyPercent, 0, MAX_COMBINED_TRIM - drag.startTrim.bottom);
    } else if (drag.handle === "bottom") {
      next.bottom = clamp(drag.startTrim.bottom - dyPercent, 0, MAX_COMBINED_TRIM - drag.startTrim.top);
    } else if (drag.handle === "left") {
      next.left = clamp(drag.startTrim.left + dxPercent, 0, MAX_COMBINED_TRIM - drag.startTrim.right);
    } else {
      next.right = clamp(drag.startTrim.right - dxPercent, 0, MAX_COMBINED_TRIM - drag.startTrim.left);
    }

    setTrim(next);
  }

  function finishCropDrag(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    cropDragRef.current = null;
  }

  function adjustZoom(nextZoom: number) {
    setFocus((current) => ({ ...current, zoom: clamp(nextZoom, MIN_FOCUS_ZOOM, MAX_FOCUS_ZOOM) }));
  }

  async function saveFocus(nextFocus: PhotoFocus) {
    const response = await fetch(`/api/sessions/${sessionId}/winner-photo-focus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ x: nextFocus.x, y: nextFocus.y, zoom: nextFocus.zoom }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || "Foto-Fokus konnte nicht gespeichert werden.");
    }
  }

  async function usePreparedPhoto() {
    if (!masterFile || localBusy || photoBusy || saving) return;
    try {
      setLocalBusy(true);
      setPhotoError(null);
      const croppedFile = await cropImageFile(masterFile, trim);
      const visibleWidth = Math.max(0.01, 1 - (trim.left + trim.right) / 100);
      const visibleHeight = Math.max(0.01, 1 - (trim.top + trim.bottom) / 100);
      const nextFocus: PhotoFocus = {
        x: clamp((focus.x - trim.left / 100) / visibleWidth, 0, 1),
        y: clamp((focus.y - trim.top / 100) / visibleHeight, 0, 1),
        zoom: focus.zoom,
      };
      await saveFocus(nextFocus);
      const syntheticEvent = { target: { files: [croppedFile], value: "" } } as unknown as ChangeEvent<HTMLInputElement>;
      await Promise.resolve(onWinnerPhotoUpload(syntheticEvent));
      clearPreparedPhoto();
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Das Foto konnte nicht gespeichert werden.");
      setLocalBusy(false);
    }
  }

  const done = hasWinnerPhoto;
  const objectPosition = `${Math.round(focus.x * 100)}% ${Math.round(focus.y * 100)}%`;
  const cropBox = {
    left: `${trim.left}%`,
    right: `${trim.right}%`,
    top: `${trim.top}%`,
    bottom: `${trim.bottom}%`,
  };

  const cropHandleProps = (handle: CropHandle) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => startCropDrag(event, handle),
    onPointerMove: moveCropDrag,
    onPointerUp: finishCropDrag,
    onPointerCancel: finishCropDrag,
  });

  if (collapsed) {
    return (
      <section className="rounded-[20px] border border-slate-200 bg-white shadow-sm">
        <button type="button" onClick={onToggleCollapsed} className={`flex w-full items-center justify-between gap-4 rounded-[20px] px-4 py-3.5 text-left transition ${done ? "bg-emerald-50" : "hover:bg-slate-50/70"}`}>
          <div className="flex items-center gap-3">
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${done ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>{done ? "✓" : "3"}</span>
            <div>
              <div className="text-sm font-bold text-slate-950">{done ? "Siegerfoto übernommen" : title}</div>
              <SummaryPill tone={done ? "success" : "muted"}>{done ? "Foto vorhanden" : "Optional"}</SummaryPill>
            </div>
          </div>
          <div className="rounded-full border px-4 py-2 text-sm font-semibold">Bearbeiten</div>
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-[20px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">3</div>
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <SummaryPill tone={done ? "success" : "muted"}>{done ? "Foto vorhanden" : "Optional"}</SummaryPill>
          </div>
        </div>
        <button type="button" onClick={onToggleCollapsed} className="rounded-full border px-4 py-2 text-sm font-semibold">{done ? "Foto übernehmen" : "Ohne Foto weiter"}</button>
      </div>

      <div className="space-y-3 px-4 pb-4">
        <input ref={winnerPhotoInputRef} type="file" accept="image/*" onChange={(event) => void handleFileChange(event)} disabled={!canUploadWinnerPhoto || controlsBusy} className="hidden" />

        <div className="flex flex-wrap gap-2">
          <ControlButton onClick={triggerFilePicker} disabled={!canUploadWinnerPhoto || controlsBusy} tone="primary">
            {preparing ? "Bild wird optimiert..." : photoBusy || localBusy ? "Speichert..." : done ? "Foto ersetzen" : masterFile ? "Anderes Foto" : "Foto auswählen"}
          </ControlButton>
          {done && !masterFile ? <ControlButton onClick={onWinnerPhotoDelete} disabled={controlsBusy} tone="danger">Löschen</ControlButton> : null}
        </div>

        {masterPreviewUrl ? (
          <div className="space-y-3 rounded-[20px] border border-slate-200 bg-slate-50 p-3">
            <div>
              <div className="text-sm font-bold text-slate-950">Foto zuschneiden & ausrichten</div>
              <div className="mt-1 text-xs leading-5 text-slate-600">Zieh die weißen Griffe direkt mit dem Finger. Dunkle Bereiche werden entfernt. Das Bild selbst kannst du weiterhin verschieben, um den Motiv-Fokus für die SiegerCard festzulegen.</div>
            </div>

            <div
              ref={focusWorkspaceRef}
              className="relative mx-auto w-full max-w-[420px] cursor-grab overflow-hidden rounded-[18px] bg-slate-950 shadow-inner select-none active:cursor-grabbing"
              style={{ touchAction: "none", aspectRatio: String(previewAspectRatio) }}
              onPointerDown={handleFocusPointerDown}
              onPointerMove={handleFocusPointerMove}
              onPointerUp={finishFocusPointer}
              onPointerCancel={finishFocusPointer}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={masterPreviewUrl}
                alt="Siegerfoto Motivfokus"
                draggable={false}
                onLoad={(event) => {
                  const image = event.currentTarget;
                  if (image.naturalWidth > 0 && image.naturalHeight > 0) setPreviewAspectRatio(image.naturalWidth / image.naturalHeight);
                }}
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain transition-transform duration-150"
                style={{ objectPosition, transform: `scale(${focus.zoom})`, transformOrigin: objectPosition }}
              />

              <div className="pointer-events-none absolute inset-x-0 top-0 bg-slate-950/65" style={{ height: `${trim.top}%` }} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-slate-950/65" style={{ height: `${trim.bottom}%` }} />
              <div className="pointer-events-none absolute inset-y-0 left-0 bg-slate-950/65" style={{ width: `${trim.left}%` }} />
              <div className="pointer-events-none absolute inset-y-0 right-0 bg-slate-950/65" style={{ width: `${trim.right}%` }} />

              <div className="pointer-events-none absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]" style={cropBox}>
                <div className="absolute inset-x-0 top-1/3 border-t border-white/25" />
                <div className="absolute inset-x-0 top-2/3 border-t border-white/25" />
                <div className="absolute inset-y-0 left-1/3 border-l border-white/25" />
                <div className="absolute inset-y-0 left-2/3 border-l border-white/25" />
              </div>

              <div {...cropHandleProps("top")} className="absolute z-20 h-10 -translate-y-1/2 touch-none" style={{ left: `${trim.left}%`, right: `${trim.right}%`, top: `${trim.top}%` }}>
                <div className="absolute left-1/2 top-1/2 h-1.5 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
              </div>
              <div {...cropHandleProps("bottom")} className="absolute z-20 h-10 translate-y-1/2 touch-none" style={{ left: `${trim.left}%`, right: `${trim.right}%`, bottom: `${trim.bottom}%` }}>
                <div className="absolute left-1/2 top-1/2 h-1.5 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
              </div>
              <div {...cropHandleProps("left")} className="absolute z-20 w-10 -translate-x-1/2 touch-none" style={{ top: `${trim.top}%`, bottom: `${trim.bottom}%`, left: `${trim.left}%` }}>
                <div className="absolute left-1/2 top-1/2 h-14 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
              </div>
              <div {...cropHandleProps("right")} className="absolute z-20 w-10 translate-x-1/2 touch-none" style={{ top: `${trim.top}%`, bottom: `${trim.bottom}%`, right: `${trim.right}%` }}>
                <div className="absolute left-1/2 top-1/2 h-14 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <ControlButton onClick={() => adjustZoom(focus.zoom - 0.15)} disabled={controlsBusy || focus.zoom <= MIN_FOCUS_ZOOM}>−</ControlButton>
              <div className="min-w-24 text-center text-[11px] font-semibold text-slate-500">Zoom {Math.round(focus.zoom * 100)} %</div>
              <ControlButton onClick={() => adjustZoom(focus.zoom + 0.15)} disabled={controlsBusy || focus.zoom >= MAX_FOCUS_ZOOM}>+</ControlButton>
              <ControlButton onClick={resetFocus} disabled={controlsBusy}>Zurücksetzen</ControlButton>
            </div>

            <div className="flex flex-wrap gap-2">
              <ControlButton onClick={() => void usePreparedPhoto()} disabled={controlsBusy} tone="primary">{photoBusy || localBusy ? "Speichert..." : "✓ Foto verwenden"}</ControlButton>
              <ControlButton onClick={clearPreparedPhoto} disabled={controlsBusy}>Abbrechen</ControlButton>
            </div>
          </div>
        ) : (
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
            {winnerPhotoUrl ? (
              <div className="relative mx-auto flex min-h-[180px] w-full max-w-[280px] items-center justify-center overflow-hidden rounded-[16px] bg-slate-950">
                <Image src={winnerPhotoUrl} alt="Siegerfoto" width={280} height={280} className="max-h-[320px] h-auto w-auto max-w-full object-contain" />
              </div>
            ) : <div className="flex min-h-[150px] flex-col items-center justify-center text-center text-xs text-slate-500">Noch kein Foto</div>}
          </div>
        )}

        {photoError ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{photoError}</div> : null}
      </div>
    </section>
  );
}
