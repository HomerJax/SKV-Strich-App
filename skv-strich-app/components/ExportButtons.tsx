"use client";

import { useState } from "react";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";

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

async function shareOrDownloadBlob(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  const nav: any = navigator;

  // Mobile share (iOS/Android) wenn verfügbar
  if (nav?.canShare?.({ files: [file] }) && nav?.share) {
    await nav.share({
      files: [file],
      title: filename,
      text: "Export aus SKV Strich App",
    });
    return;
  }

  // Download fallback
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function blobFromDataUrl(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

function getTargetEl(targetId: string) {
  const el = document.getElementById(targetId);
  if (!el) throw new Error(`Export-Bereich nicht gefunden: #${targetId}`);
  return el;
}

export default function ExportButtons({
  targetId,
  fileBaseName = "skv-export",
  className = "",
}: Props) {
  const [busy, setBusy] = useState<null | "png" | "pdf">(null);
  const [err, setErr] = useState<string | null>(null);

  async function exportPNG() {
    try {
      setErr(null);
      setBusy("png");

      const el = getTargetEl(targetId);

      // PNG als dataURL erzeugen (html-to-image)
      const dataUrl = await htmlToImage.toPng(el, {
        cacheBust: true,
        pixelRatio: Math.min(3, window.devicePixelRatio || 2),
        backgroundColor: "#ffffff",
      });

      const blob = await blobFromDataUrl(dataUrl);
      await shareOrDownloadBlob(blob, `${fileBaseName}_${stamp()}.png`);
    } catch (e: any) {
      setErr(e?.message ?? "Export PNG fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }

  async function exportPDF() {
    try {
      setErr(null);
      setBusy("pdf");

      const el = getTargetEl(targetId);

      // Bild erzeugen
      const dataUrl = await htmlToImage.toPng(el, {
        cacheBust: true,
        pixelRatio: Math.min(3, window.devicePixelRatio || 2),
        backgroundColor: "#ffffff",
      });

      // PDF bauen (mehrseitig, falls zu hoch)
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Bildgröße ermitteln
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Konnte Export-Bild nicht laden."));
      });

      const imgWidthPx = img.width;
      const imgHeightPx = img.height;

      // Wir skalieren so, dass die Breite auf A4 passt
      const imgWidthMm = pageWidth;
      const imgHeightMm = (imgHeightPx * imgWidthMm) / imgWidthPx;

      let remaining = imgHeightMm;
      let offsetY = 0;

      while (remaining > 0) {
        pdf.addImage(dataUrl, "PNG", 0, -offsetY, imgWidthMm, imgHeightMm);
        remaining -= pageHeight;
        offsetY += pageHeight;
        if (remaining > 0) pdf.addPage();
      }

      pdf.save(`${fileBaseName}_${stamp()}.pdf`);
    } catch (e: any) {
      setErr(e?.message ?? "Export PDF fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <button
          onClick={exportPNG}
          disabled={busy !== null}
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-slate-50 disabled:opacity-50"
          type="button"
        >
          {busy === "png" ? "Export…" : "Export PNG"}
        </button>

        <button
          onClick={exportPDF}
          disabled={busy !== null}
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-slate-50 disabled:opacity-50"
          type="button"
        >
          {busy === "pdf" ? "Export…" : "Export PDF"}
        </button>
      </div>

      {err && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Export-Fehler: {err}
        </div>
      )}
    </div>
  );
}
