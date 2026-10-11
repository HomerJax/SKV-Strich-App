"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Props = { sessionId: number; photoUrl: string | null; onBack: () => void };

export default function TournamentWinnerCard({ sessionId, photoUrl, onBack }: Props) {
  const [winner, setWinner] = useState("Turniersieger");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/sessions/${sessionId}/tournament`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Turnierdaten nicht verfügbar");
        return response.json();
      })
      .then((data: { standings?: { teamName: string }[] }) => {
        if (active && data.standings?.[0]?.teamName) setWinner(data.standings[0].teamName);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [sessionId]);

  async function shareCard() {
    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Bild konnte nicht erstellt werden.");
      ctx.fillStyle = "#080e20";
      ctx.fillRect(0, 0, 1080, 1350);
      ctx.textAlign = "center";
      ctx.fillStyle = "#5eead4";
      ctx.font = "bold 45px Arial, sans-serif";
      ctx.fillText("strikr", 540, 105);
      ctx.font = "bold 40px Arial, sans-serif";
      ctx.fillText("TURNIERSIEGER", 540, 220);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 68px Arial, sans-serif";
      const name = winner.length > 24 ? winner.slice(0, 23) + "…" : winner;
      ctx.fillText(name, 540, 310, 960);
      ctx.fillStyle = "#fbbf24";
      ctx.font = "95px Arial, sans-serif";
      ctx.fillText("🏆", 540, 445);
      if (photoUrl) {
        const image = new window.Image();
        image.crossOrigin = "anonymous";
        image.src = photoUrl;
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("Siegerfoto konnte nicht geladen werden."));
        });
        const x = 70, y = 520, w = 940, h = 680;
        const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
        const sw = w / scale, sh = h / scale;
        ctx.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
      }
      ctx.fillStyle = "#5eead4";
      ctx.font = "bold 35px Arial, sans-serif";
      ctx.fillText("GEMEINSAM GEWONNEN. MIT STRIKR.", 540, 1280);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Bildexport fehlgeschlagen.")), "image/png"));
      const file = new File([blob], "strikr-turniersieger.png", { type: "image/png" });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], title: "strikr Turniersieger" });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-4 rounded-xl bg-white p-4 text-center">
    <div className="text-4xl">🏆</div>
    <p className="text-xs font-black uppercase tracking-widest text-teal-700">Turniersieger</p>
    <h3 className="text-2xl font-extrabold text-slate-950">{winner}</h3>
    <p className="text-sm text-slate-600">Glückwunsch zum Turniersieg!</p>
    {photoUrl ? <Image src={photoUrl} alt="Siegerfoto" width={960} height={720} unoptimized className="mx-auto w-full rounded-xl object-cover" /> : null}
    <button type="button" onClick={() => void shareCard()} disabled={busy} className="w-full rounded-xl bg-teal-700 px-4 py-4 font-bold text-white disabled:opacity-50">{busy ? "Siegercard wird erstellt …" : "🏆 Siegercard teilen"}</button>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    <button type="button" onClick={onBack} className="w-full rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 font-bold text-teal-900">Turnier und Abschlusstabelle ansehen →</button>
  </div>;
}
