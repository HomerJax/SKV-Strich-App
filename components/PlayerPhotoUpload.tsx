"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { compressImageFile } from "@/lib/client-images/compress-image";

type Props = {
  playerId: number;
  birthDate: string | null;
  jerseyNumber: string | null;
  children: ReactNode;
  className?: string;
};

export default function PlayerPhotoUpload({
  playerId,
  birthDate,
  jerseyNumber,
  children,
  className = "",
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const formData = new FormData();
      formData.set("player_id", String(playerId));
      formData.set("birth_date", birthDate ?? "");
      formData.set("jersey_number", jerseyNumber ?? "");
      formData.set("photo", uploadFile, `player-${playerId}.jpg`);

      const response = await fetch("/api/player-pass", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });

      if (!response.ok || (response.redirected && new URL(response.url).searchParams.has("error"))) {
        throw new Error("Foto konnte nicht gespeichert werden.");
      }

      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Foto konnte nicht gespeichert werden."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <label
        className="group relative block h-full w-full cursor-pointer"
        title="Spielerfoto auswählen"
        aria-label="Spielerfoto auswählen"
      >
        {children}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={handlePhotoChange}
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/45 px-1 py-1 text-center text-[9px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {busy ? "Wird hochgeladen …" : "Foto ändern"}
        </span>
        {busy ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 text-xs font-black text-white">
            …
          </span>
        ) : null}
      </label>
      {error ? <div className="mt-1 text-[10px] font-bold text-rose-700">{error}</div> : null}
    </div>
  );
}
