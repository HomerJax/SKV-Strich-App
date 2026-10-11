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
      const response = await fetch(`/api/share/tournament/${sessionId}/image`, { cache: "no-store" });
      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
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
