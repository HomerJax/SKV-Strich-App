"use client";

import type {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  WheelEvent as ReactWheelEvent,
} from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { compressImageFile } from "@/lib/client-images/compress-image";
import { useI18n } from "@/components/i18n/I18nProvider";

type Props = {
  playerId: number;
  birthDate: string | null;
  jerseyNumber: string | null;
  photoUrl?: string | null;
  initialPositionX?: number | null;
  initialPositionY?: number | null;
  initialZoom?: number | null;
  children: ReactNode;
  className?: string;
  readOnly?: boolean;
};

type Point = { x: number; y: number };
type DragStart = {
  pointerId: number;
  x: number;
  y: number;
  positionX: number;
  positionY: number;
};
type PinchStart = {
  distance: number;
  centerX: number;
  centerY: number;
  positionX: number;
  positionY: number;
  zoom: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function center(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export default function PlayerPhotoUpload({
  playerId,
  birthDate,
  jerseyNumber,
  photoUrl,
  initialPositionX = 50,
  initialPositionY = 50,
  initialZoom = 1,
  children,
  className = "",
  readOnly = false,
}: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const dragStartRef = useRef<DragStart | null>(null);
  const pinchStartRef = useRef<PinchStart | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(photoUrl ?? null);
  const [positionX, setPositionX] = useState(clamp(Number(initialPositionX ?? 50), 0, 100));
  const [positionY, setPositionY] = useState(clamp(Number(initialPositionY ?? 50), 0, 100));
  const [zoom, setZoom] = useState(clamp(Number(initialZoom ?? 1), 1, 3));
  const [dragging, setDragging] = useState(false);

  const savedPositionX = clamp(Number(initialPositionX ?? 50), 0, 100);
  const savedPositionY = clamp(Number(initialPositionY ?? 50), 0, 100);
  const savedZoom = clamp(Number(initialZoom ?? 1), 1, 3);

  useEffect(() => {
    setPreviewUrl(photoUrl ?? null);
    setPositionX(savedPositionX);
    setPositionY(savedPositionY);
    setZoom(savedZoom);
  }, [photoUrl, savedPositionX, savedPositionY, savedZoom]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function resetGesture() {
    pointersRef.current.clear();
    dragStartRef.current = null;
    pinchStartRef.current = null;
    setDragging(false);
  }

  function closeEditor() {
    resetGesture();
    setEditorOpen(false);
    if (pendingFile) {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setPendingFile(null);
      setPreviewUrl(photoUrl ?? null);
      setPositionX(savedPositionX);
      setPositionY(savedPositionY);
      setZoom(savedZoom);
    }
  }

  function openAlignmentEditor() {
    if (!photoUrl && !previewUrl) return;
    setPendingFile(null);
    setPreviewUrl(photoUrl ?? previewUrl);
    setPositionX(savedPositionX);
    setPositionY(savedPositionY);
    setZoom(savedZoom);
    setEditorOpen(true);
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) return;

    try {
      setBusy(true);
      setError(null);
      const uploadFile = await compressImageFile(file, {
        maxWidth: 1400,
        maxHeight: 1750,
        quality: 0.84,
        outputType: "image/jpeg",
      });
      const objectUrl = URL.createObjectURL(uploadFile);
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setPendingFile(uploadFile);
      setPreviewUrl(objectUrl);
      setPositionX(50);
      setPositionY(50);
      setZoom(1);
      setEditorOpen(true);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Foto konnte nicht vorbereitet werden.");
    } finally {
      setBusy(false);
    }
  }

  async function savePhotoAlignment() {
    if (!previewUrl || busy) return;
    try {
      setBusy(true);
      setError(null);
      const formData = new FormData();
      formData.set("player_id", String(playerId));
      formData.set("birth_date", birthDate ?? "");
      formData.set("jersey_number", jerseyNumber ?? "");
      formData.set("photo_position_x", String(Math.round(positionX)));
      formData.set("photo_position_y", String(Math.round(positionY)));
      formData.set("photo_zoom", String(Number(zoom.toFixed(2))));
      if (pendingFile) formData.set("photo", pendingFile, `player-${playerId}.jpg`);

      const response = await fetch("/api/player-pass", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      if (!response.ok || (response.redirected && new URL(response.url).searchParams.has("error"))) {
        throw new Error("Fotoausrichtung konnte nicht gespeichert werden.");
      }

      resetGesture();
      setEditorOpen(false);
      setPendingFile(null);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Fotoausrichtung konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  function beginSinglePointer(pointerId: number, point: Point) {
    dragStartRef.current = {
      pointerId,
      x: point.x,
      y: point.y,
      positionX,
      positionY,
    };
    pinchStartRef.current = null;
  }

  function beginPinch() {
    const points = Array.from(pointersRef.current.values());
    if (points.length < 2) return;
    const [a, b] = points;
    const pinchCenter = center(a, b);
    pinchStartRef.current = {
      distance: Math.max(1, distance(a, b)),
      centerX: pinchCenter.x,
      centerY: pinchCenter.y,
      positionX,
      positionY,
      zoom,
    };
    dragStartRef.current = null;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (busy) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setDragging(true);

    if (pointersRef.current.size === 1) {
      beginSinglePointer(event.pointerId, { x: event.clientX, y: event.clientY });
    } else if (pointersRef.current.size === 2) {
      beginPinch();
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    event.preventDefault();
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const rect = workspace.getBoundingClientRect();

    if (pointersRef.current.size >= 2 && pinchStartRef.current) {
      const points = Array.from(pointersRef.current.values());
      const [a, b] = points;
      const pinch = pinchStartRef.current;
      const pinchCenter = center(a, b);
      const nextZoom = clamp(pinch.zoom * (distance(a, b) / pinch.distance), 1, 3);
      const dx = pinchCenter.x - pinch.centerX;
      const dy = pinchCenter.y - pinch.centerY;
      setZoom(nextZoom);
      setPositionX(clamp(pinch.positionX - (dx / Math.max(1, rect.width)) * (100 / nextZoom), 0, 100));
      setPositionY(clamp(pinch.positionY - (dy / Math.max(1, rect.height)) * (100 / nextZoom), 0, 100));
      return;
    }

    const drag = dragStartRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    setPositionX(clamp(drag.positionX - (dx / Math.max(1, rect.width)) * (100 / zoom), 0, 100));
    setPositionY(clamp(drag.positionY - (dy / Math.max(1, rect.height)) * (100 / zoom), 0, 100));
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.delete(event.pointerId);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const remaining = Array.from(pointersRef.current.entries());
    if (remaining.length === 1) {
      const [pointerId, point] = remaining[0];
      beginSinglePointer(pointerId, point);
      setDragging(true);
    } else if (remaining.length >= 2) {
      beginPinch();
      setDragging(true);
    } else {
      dragStartRef.current = null;
      pinchStartRef.current = null;
      setDragging(false);
    }
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    if (busy) return;
    const factor = event.deltaY < 0 ? 1.08 : 0.92;
    setZoom((current) => clamp(current * factor, 1, 3));
  }

  const imageStyle = {
    objectPosition: `${positionX}% ${positionY}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${positionX}% ${positionY}%`,
  } as const;

  if (readOnly) {
    return <div className={className}>{children}</div>;
  }

  return (
    <>
      <div>
        <div className={className}>
          {photoUrl || previewUrl ? (
            <button
              type="button"
              onClick={openAlignmentEditor}
              disabled={busy}
              className="block h-full w-full cursor-pointer text-left disabled:cursor-default"
              title="Foto ausrichten"
              aria-label="Foto ausrichten"
            >
              {children}
            </button>
          ) : (
            <div className="h-full w-full">{children}</div>
          )}
        </div>

        <div className="mt-1.5 flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            title="Foto ändern"
            aria-label="Foto ändern"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
          >
            {busy ? <span className="text-xs font-black">…</span> : <Camera className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
          {photoUrl || previewUrl ? <div className="text-center text-[8px] leading-tight text-slate-400">Auf Bild klicken zum Ausrichten</div> : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={handlePhotoChange}
        />
        {error ? <div className="mt-1 text-[10px] font-bold text-rose-700">{error}</div> : null}
      </div>

      {editorOpen && previewUrl ? (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/65 p-0 sm:items-center sm:p-4">
          <div className="max-h-[94vh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white p-4 shadow-2xl sm:rounded-[28px] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">Foto ausrichten</h3>
                <p className="mt-1 text-xs text-slate-500">Bild direkt verschieben. Mit zwei Fingern oder Mausrad zoomen.</p>
              </div>
              <button type="button" onClick={closeEditor} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-black text-slate-600">×</button>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_92px] items-end gap-4">
              <div>
                <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                  <span>{t("playerCard.title")}</span>
                  <span className="normal-case tracking-normal">{zoom.toFixed(1)}×</span>
                </div>
                <div
                  ref={workspaceRef}
                  role="application"
                  aria-label="Foto verschieben und zoomen"
                  className={`relative aspect-[4/5] touch-none select-none overflow-hidden rounded-2xl border-2 border-white bg-slate-200 shadow-md ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                  onWheel={handleWheel}
                  onDoubleClick={() => {
                    setPositionX(50);
                    setPositionY(50);
                    setZoom(1);
                  }}
                >
                  <img
                    src={previewUrl}
                    alt="Vorschau Spielerpass"
                    draggable={false}
                    onDragStart={(event) => event.preventDefault()}
                    className="pointer-events-none h-full w-full object-cover will-change-transform"
                    style={imageStyle}
                  />
                  <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
                  <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-full bg-black/55 px-3 py-1.5 text-center text-[10px] font-bold text-white backdrop-blur-sm">
                    Ziehen · Pinch / Mausrad zum Zoomen
                  </div>
                </div>
              </div>
              <div>
                <div className="mb-1 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Profil</div>
                <div className="mx-auto h-[76px] w-[76px] rounded-full border-4 border-white bg-slate-200 shadow-md">
                  <div className="relative h-full w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="pointer-events-none absolute inset-x-0 -top-[12.5%] h-[125%] overflow-hidden">
                      <img src={previewUrl} alt="Vorschau Profilbild" draggable={false} className="block h-full w-full object-cover" style={imageStyle} />
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-center text-[9px] leading-tight text-slate-400">So wirkt es oben im Header</div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3">
              <div className="text-[11px] leading-snug text-slate-500">Am Handy: <b>ziehen + zwei Finger</b><br/>Im Browser: <b>ziehen + Mausrad</b></div>
              <button type="button" onClick={() => { setPositionX(50); setPositionY(50); setZoom(1); }} className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">Zurücksetzen</button>
            </div>

            <div className="mt-4 flex gap-2">
              <button type="button" onClick={closeEditor} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600">Abbrechen</button>
              <button type="button" onClick={savePhotoAlignment} disabled={busy} className="flex-1 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? "Speichert …" : "Speichern"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
