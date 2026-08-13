"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { fetchImageAsFile } from "@/lib/share/utils";

const TABLE_ID = "export-standings";
const PORTAL_ID = "standings-top10-share-portal";

type NavigatorWithFileShare = Navigator & {
  canShare?: (data: ShareData) => boolean;
};

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);

  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name || "strikr-top-10.png";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function copyImageToClipboard(file: File) {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    typeof navigator.clipboard.write !== "function" ||
    typeof ClipboardItem === "undefined"
  ) {
    return false;
  }

  try {
    const pngBlob =
      file.type === "image/png"
        ? file
        : new Blob([await file.arrayBuffer()], { type: "image/png" });

    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": pngBlob,
      }),
    ]);

    return true;
  } catch {
    return false;
  }
}

export default function StandingsTop10Share() {
  const searchParams = useSearchParams();
  const season = searchParams.get("season");
  const [preparedFile, setPreparedFile] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let observer: MutationObserver | null = null;

    function mountAboveTable() {
      const table = document.getElementById(TABLE_ID);
      if (!table?.parentElement) return false;

      let mount = document.getElementById(PORTAL_ID);
      if (!mount) {
        mount = document.createElement("div");
        mount.id = PORTAL_ID;
        mount.className = "mb-4";
        table.parentElement.insertBefore(mount, table);
      }

      setPortalTarget(mount);
      return true;
    }

    if (!mountAboveTable()) {
      observer = new MutationObserver(() => {
        if (mountAboveTable()) {
          observer?.disconnect();
          observer = null;
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      document.getElementById(PORTAL_ID)?.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      try {
        setPreparing(true);
        setPreparedFile(null);
        setMessage(null);

        const query = season ? `?season=${encodeURIComponent(season)}` : "";
        const imageUrl = `/api/share/standings/image${query}${query ? "&" : "?"}ts=${Date.now()}`;
        const file = await fetchImageAsFile(imageUrl, "strikr-top-10.png");

        if (cancelled) return;
        setPreparedFile(file);
      } catch (error) {
        if (cancelled) return;
        setPreparedFile(null);
        setMessage(
          error instanceof Error
            ? error.message
            : "Top-10-Sharecard konnte nicht vorbereitet werden."
        );
      } finally {
        if (!cancelled) setPreparing(false);
      }
    }

    void prepare();

    return () => {
      cancelled = true;
    };
  }, [season]);

  async function shareNative(file: File) {
    if (!Capacitor.isPluginAvailable("Share") || !Capacitor.isPluginAvailable("Filesystem")) {
      throw new Error("NATIVE_SHARE_UPDATE_REQUIRED");
    }

    const data = await fileToBase64(file);
    const path = `share/${Date.now()}-strikr-top-10.png`;
    const written = await Filesystem.writeFile({
      path,
      data,
      directory: Directory.Cache,
      recursive: true,
    });

    await Share.share({
      title: "strikr Top 10",
      files: [written.uri],
      dialogTitle: "Top 10 teilen",
    });
  }

  async function shareWeb(file: File) {
    const nav = navigator as NavigatorWithFileShare;
    const shareData: ShareData = {
      files: [file],
      title: "strikr Top 10",
    };

    if (typeof nav.share === "function") {
      const canShareFiles = typeof nav.canShare !== "function" || nav.canShare(shareData);

      if (canShareFiles) {
        try {
          await nav.share(shareData);
          return "shared" as const;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return "cancelled" as const;
          }
          throw error;
        }
      }
    }

    const copied = await copyImageToClipboard(file);
    if (copied) return "copied" as const;

    downloadFile(file);
    return "downloaded" as const;
  }

  async function handleShare() {
    if (!preparedFile || sharing) return;

    setSharing(true);
    setMessage(null);

    try {
      if (Capacitor.isNativePlatform()) {
        await shareNative(preparedFile);
        setMessage("Top 10 erfolgreich geteilt.");
      } else {
        const result = await shareWeb(preparedFile);

        if (result === "shared") {
          setMessage("Top 10 erfolgreich geteilt.");
        } else if (result === "cancelled") {
          setMessage("Top 10 ist bereit.");
        } else if (result === "copied") {
          setMessage("Direktes Teilen wird von diesem Browser nicht unterstützt. Top 10 wurde in die Zwischenablage kopiert.");
        } else {
          setMessage("Direktes Teilen wird von diesem Browser nicht unterstützt. Top 10 wurde als Bild gespeichert.");
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "NATIVE_SHARE_UPDATE_REQUIRED") {
        setMessage("Für das native Teilen ist ein App-Update erforderlich.");
        return;
      }

      const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
      setMessage(`Teilen nicht möglich (${detail}).`);
    } finally {
      setSharing(false);
    }
  }

  const content = (
    <section className="standings-top10-share rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.045)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-bold text-slate-900">Tabelle teilen</div>
          <div className="mt-1 text-[11px] leading-5 text-slate-500">
            Teile die aktuellen Top 10 als strikr Sharecard.
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleShare()}
          disabled={preparing || sharing || !preparedFile}
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {preparing || !preparedFile
            ? "Top 10 wird vorbereitet…"
            : sharing
              ? "Teile…"
              : "Top 10 teilen"}
        </button>
      </div>

      {message ? (
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          {message}
        </div>
      ) : null}
    </section>
  );

  return portalTarget ? createPortal(content, portalTarget) : null;
}
