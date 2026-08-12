"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import * as htmlToImage from "html-to-image";

const TARGET_ID = "export-standings-card-1";
const TABLE_ID = "export-standings";
const PORTAL_ID = "standings-top10-share-portal";

type NavigatorWithFileShare = Navigator & {
  canShare?: (data: ShareData) => boolean;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function buildFileName() {
  const now = new Date();
  return `strikr-top-10-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}_${pad(now.getHours())}-${pad(now.getMinutes())}.png`;
}

async function dataUrlToFile(dataUrl: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], buildFileName(), { type: "image/png" });
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export default function StandingsTop10Share() {
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
    let preparingNow = false;
    let observer: MutationObserver | null = null;

    async function prepare() {
      if (preparingNow || cancelled) return;

      const element = document.getElementById(TARGET_ID);
      if (!element) return;

      preparingNow = true;
      setPreparing(true);
      setPreparedFile(null);
      setMessage(null);

      try {
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
        });

        const dataUrl = await htmlToImage.toPng(element, {
          cacheBust: true,
          pixelRatio: Math.max(2, Math.min(3, window.devicePixelRatio || 2)),
          backgroundColor: "#020617",
          skipFonts: false,
        });

        const file = await dataUrlToFile(dataUrl);
        if (cancelled) return;

        setPreparedFile(file);
        setMessage(null);
        observer?.disconnect();
        observer = null;
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
        preparingNow = false;
      }
    }

    void prepare();

    if (!document.getElementById(TARGET_ID)) {
      observer = new MutationObserver(() => {
        if (document.getElementById(TARGET_ID)) void prepare();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);

  async function handleShare() {
    if (!preparedFile || sharing) return;

    setSharing(true);
    setMessage(null);

    try {
      const nav = navigator as NavigatorWithFileShare;
      const shareData: ShareData = { files: [preparedFile] };

      if (typeof nav.share === "function") {
        if (typeof nav.canShare === "function" && !nav.canShare(shareData)) {
          throw new Error("Bildfreigabe wird auf diesem Gerät nicht unterstützt.");
        }

        await nav.share(shareData);
        setMessage("Top 10 erfolgreich geteilt.");
        return;
      }

      downloadFile(preparedFile);
      setMessage("Top 10 als Bild gespeichert.");
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        setMessage(null);
        return;
      }

      const detail = error instanceof Error ? `${error.name}: ${error.message}` : "Unbekannter Fehler";
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
