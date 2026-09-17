"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImageFile } from "@/lib/client-images/compress-image";

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
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(photoUrl ?? null);
  const [positionX, setPositionX] = useState(clamp(Number(initialPositionX ?? 50), 0, 100));
  const [positionY, setPositionY] = useState(clamp(Number(initialPositionY ?? 50), 0, 100));
  const [zoom, setZoom] = useState(clamp(Number(initialZoom ?? 1), 1, 3));

  useEffect(() => {
    setPreviewUrl(photoUrl ?? null);
    setPositionX(clamp(Number(initialPositionX ?? 50), 0, 100));
    setPositionY(clamp(Number(initialPositionY ?? 50), 0, 100));
    setZoom(clamp(Number(initialZoom ?? 1), 1, 3));
  }, [photoUrl, initialPositionX, initialPositionY, initialZoom]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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

      setEditorOpen(false);
      setPendingFile(null);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Fotoausrichtung konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  const imageStyle = {
    objectPosition: `${positionX}% ${positionY}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${positionX}% ${positionY}%`,
  } as const;

  return (
    <>
      <div className={className}>
        <div className="group relative h-full w-full">
          {children}
          <div className="absolute inset-x-1 bottom-1 flex gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="flex-1 rounded-lg bg-black/60 px-1.5 py-1.5 text-[9px] font-black text-white backdrop-blur-sm"
            >
              {busy ? "…" : "Foto ändern"}
            </button>
            {photoUrl || previewUrl ? (
              <button
                type="button"
                onClick={() => {
                  setPendingFile(null);
                  setPreviewUrl(photoUrl ?? previewUrl);
                  setEditorOpen(true);
                }}
                disabled={busy}
                className="flex-1 rounded-lg bg-black/60 px-1.5 py-1.5 text-[9px] font-black text-white backdrop-blur-sm"
              >
                Ausrichten
              </button>
            ) : null}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={handlePhotoChange}
          />
        </div>
        {error ? <div className="mt-1 text-[10px] font-bold text-rose-700">{error}</div> : null}
      </div>

      {editorOpen && previewUrl ? (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/65 p-0 sm:items-center sm:p-4">
          <div className="max-h-[94vh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white p-4 shadow-2xl sm:rounded-[28px] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">Foto ausrichten</h3>
                <p className="mt-1 text-xs text-slate-500">Einmal einstellen – Spielerpass und Profilbild nutzen dieselbe Ausrichtung.</p>
              </div>
              <button type="button" onClick={() => setEditorOpen(false)} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-black text-slate-600">×</button>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_92px] items-end gap-4">
              <div>
                <div className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Spielerpass</div>
                <div className="aspect-[4/5] overflow-hidden rounded-2xl border-2 border-white bg-slate-200 shadow-md">
                  <img src={previewUrl} alt="Vorschau Spielerpass" className="h-full w-full object-cover" style={imageStyle} />
                </div>
              </div>
              <div>
                <div className="mb-1 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Profil</div>
                <div className="mx-auto h-[76px] w-[76px] overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-md">
                  <img src={previewUrl} alt="Vorschau Profilbild" className="h-full w-full object-cover" style={imageStyle} />
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4 rounded-2xl bg-slate-50 p-4">
              <label className="block text-xs font-bold text-slate-700">Horizontal <span className="float-right font-mono text-slate-400">{Math.round(positionX)}%</span><input type="range" min="0" max="100" value={positionX} onChange={(e)=>setPositionX(Number(e.target.value))} className="mt-2 w-full"/></label>
              <label className="block text-xs font-bold text-slate-700">Vertikal <span className="float-right font-mono text-slate-400">{Math.round(positionY)}%</span><input type="range" min="0" max="100" value={positionY} onChange={(e)=>setPositionY(Number(e.target.value))} className="mt-2 w-full"/></label>
              <label className="block text-xs font-bold text-slate-700">Zoom <span className="float-right font-mono text-slate-400">{zoom.toFixed(1)}×</span><input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(e)=>setZoom(Number(e.target.value))} className="mt-2 w-full"/></label>
              <button type="button" onClick={()=>{setPositionX(50);setPositionY(50);setZoom(1);}} className="text-xs font-bold text-slate-500">Zurücksetzen</button>
            </div>

            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setEditorOpen(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600">Abbrechen</button>
              <button type="button" onClick={savePhotoAlignment} disabled={busy} className="flex-1 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? "Speichert …" : "Ausrichtung speichern"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
