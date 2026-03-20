"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import * as htmlToImage from "html-to-image";

type Props = {
  targetId: string;
  fileBaseName?: string;
  className?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
    d.getHours()
  )}-${pad(d.getMinutes())}`;
}

function sanitizeFileBaseName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9äöüß_-]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "strikr-export";
}

function getTargetEl(targetId: string) {
  const el = document.getElementById(targetId);
  if (!el) throw new Error(`Export-Bereich nicht gefunden: #${targetId}`);
  return el;
}

async function blobFromDataUrl(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

async function shareOrDownloadBlob(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  const nav: any = navigator;

  if (nav?.canShare?.({ files: [file] }) && nav?.share) {
    await nav.share({
      files: [file],
      title: "strikr Export",
      text: "made with strikr · #strikr",
    });
    return "shared";
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return "downloaded";
}

function getExportFileName(fileBaseName: string, extension: "png" | "pdf") {
  return `${sanitizeFileBaseName(fileBaseName)}_${stamp()}.${extension}`;
}

async function createPngDataUrl(targetId: string) {
  const el = getTargetEl(targetId);

  return await htmlToImage.toPng(el, {
    cacheBust: true,
    pixelRatio: Math.max(2, Math.min(4, window.devicePixelRatio || 2)),
    backgroundColor: "#ffffff",
    skipFonts: false,
  });
}

export default function ExportButtons({
  targetId,
  fileBaseName = "strikr-export",
  className = "",
}: Props) {
  const [busy, setBusy] = useState<null | "png" | "pdf">(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function exportPNG() {
    try {
      setErr(null);
      setMsg(null);
      setBusy("png");

      const dataUrl = await createPngDataUrl(targetId);
      const blob = await blobFromDataUrl(dataUrl);

      const result = await shareOrDownloadBlob(
        blob,
        getExportFileName(fileBaseName, "png")
      );

      if (result === "shared") {
        setMsg("PNG erfolgreich geteilt.");
      } else {
        setMsg("PNG erfolgreich heruntergeladen.");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Export PNG fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }

  async function exportPDF() {
    try {
      setErr(null);
      setMsg(null);
      setBusy("pdf");

      const dataUrl = await createPngDataUrl(targetId);

      const img = new Image();
      img.src = dataUrl;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () =>
          reject(new Error("Konnte Export-Bild nicht laden."));
      });

      const jspdfModule = await import("jspdf/dist/jspdf.es.min.js");
      const JsPdfCtor =
        (jspdfModule as any).jsPDF || (jspdfModule as any).default;
      const pdf = new JsPdfCtor("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidthPx = img.width;
      const imgHeightPx = img.height;

      const imgWidthMm = pageWidth;
      const imgHeightMm = (imgHeightPx * imgWidthMm) / imgWidthPx;

      let renderedHeight = 0;
      let pageIndex = 0;

      while (renderedHeight < imgHeightMm) {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        pdf.addImage(
          dataUrl,
          "PNG",
          0,
          -renderedHeight,
          imgWidthMm,
          imgHeightMm,
          undefined,
          "FAST"
        );

        renderedHeight += pageHeight;
        pageIndex += 1;
      }

      pdf.save(getExportFileName(fileBaseName, "pdf"));
      setMsg("PDF erfolgreich heruntergeladen.");
    } catch (e: any) {
      setErr(e?.message ?? "Export PDF fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }

  const isBusy = busy !== null;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={exportPNG}
          disabled={isBusy}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
        >
          {busy === "png" ? "Exportiere PNG…" : "Export PNG"}
        </button>

        <button
          onClick={exportPDF}
          disabled={isBusy}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
        >
          {busy === "pdf" ? "Exportiere PDF…" : "Export PDF"}
        </button>
      </div>

      {msg && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {msg}
        </div>
      )}

      {err && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Export-Fehler: {err}
        </div>
      )}
    </div>
  );
}