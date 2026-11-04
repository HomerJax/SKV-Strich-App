"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";

export type EventReportData = {
  event_kind?: "event" | "match" | null;
  event_title?: string | null;
  event_score_for?: number | null;
  event_score_against?: number | null;
  event_report?: string | null;
};

type SaveResponse = {
  ok?: boolean;
  error?: string;
  kind?: "event" | "match";
  title?: string | null;
  scoreFor?: number | null;
  scoreAgainst?: number | null;
  report?: string | null;
  photoUrl?: string | null;
};

export default function SessionEventReportCard({
  sessionId,
  data,
  initialPhotoUrl,
  canEdit,
}: {
  sessionId: number;
  data: EventReportData;
  initialPhotoUrl: string | null;
  canEdit: boolean;
}) {
  const { locale } = useI18n();
  const de = locale === "de";
  const router = useRouter();
  const [kind, setKind] = useState<"event" | "match">(data.event_kind === "match" ? "match" : "event");
  const [title, setTitle] = useState(data.event_title ?? "");
  const [scoreFor, setScoreFor] = useState(data.event_score_for == null ? "" : String(data.event_score_for));
  const [scoreAgainst, setScoreAgainst] = useState(data.event_score_against == null ? "" : String(data.event_score_against));
  const [report, setReport] = useState(data.event_report ?? "");
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [file, setFile] = useState<File | null>(null);
  const [deletePhoto, setDeletePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scoreReady = kind === "match" && scoreFor !== "" && scoreAgainst !== "";

  async function save() {
    if (saving) return;
    setSaving(true);
    setFeedback("");
    setError("");
    const form = new FormData();
    form.set("kind", kind);
    form.set("title", title);
    form.set("score_for", kind === "match" ? scoreFor : "");
    form.set("score_against", kind === "match" ? scoreAgainst : "");
    form.set("report", report);
    if (file) form.set("photo", file);
    if (deletePhoto) form.set("delete_photo", "true");

    try {
      const res = await fetch("/api/sessions/" + sessionId + "/event-report", {
        method: "POST", body: form, credentials: "same-origin",
      });
      const payload = await res.json() as SaveResponse;
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? (de ? "Speichern fehlgeschlagen." : "Save failed."));
      setKind(payload.kind ?? kind);
      setTitle(payload.title ?? "");
      setScoreFor(payload.scoreFor == null ? "" : String(payload.scoreFor));
      setScoreAgainst(payload.scoreAgainst == null ? "" : String(payload.scoreAgainst));
      setReport(payload.report ?? "");
      setPhotoUrl(payload.photoUrl ?? null);
      setFile(null);
      setDeletePhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFeedback(de ? "Gespeichert." : "Saved.");
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : (de ? "Speichern fehlgeschlagen." : "Save failed."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">
              {kind === "match" ? (de ? "Spiel · Ohne Trainingsstatistik" : "Match · No training stats") : (de ? "Event" : "Event")}
            </p>
            <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-950">
              {title || (kind === "match" ? (de ? "Begegnung" : "Fixture") : (de ? "Event-Details" : "Event details"))}
            </h2>
          </div>
          {canEdit ? <button type="button" onClick={() => setEditing(v => !v)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800">
            {editing ? (de ? "Schließen" : "Close") : (de ? "Bearbeiten / Ergebnis eintragen" : "Edit / enter result")}
          </button> : null}
        </div>
        {kind === "match" ? (
          <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-5 text-center text-white">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">{de ? "Ergebnis" : "Score"}</p>
            <p className="mt-1 text-4xl font-black tabular-nums">{scoreReady ? scoreFor + " : " + scoreAgainst : "– : –"}</p>
            <p className="mt-1 text-xs text-white/60">{scoreReady ? (de ? "Eigenes Team : Gegner" : "Our team : Opponent") : (de ? "Noch kein Ergebnis eingetragen" : "No score yet")}</p>
          </div>
        ) : null}
        {report ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{report}</p> : null}
        {photoUrl && !deletePhoto ? (
          <div className="relative mt-4 overflow-hidden rounded-2xl bg-slate-100">
            <Image src={photoUrl} alt={kind === "match" ? (de ? "Spiel- oder Siegerfoto" : "Match photo") : (de ? "Event-Foto" : "Event photo")} width={1200} height={800} unoptimized className="h-auto max-h-[440px] w-full object-contain" />
          </div>
        ) : null}
        {feedback ? <p role="status" className="mt-3 text-xs font-semibold text-emerald-700">{feedback}</p> : null}
        {error ? <p role="alert" className="mt-3 text-xs font-semibold text-red-700">{error}</p> : null}
      </div>

      {canEdit && editing ? (
        <form onSubmit={e => { e.preventDefault(); void save(); }} className="space-y-3 border-t border-slate-200 bg-slate-50 p-4 sm:p-5">
          <fieldset className="flex gap-4 text-sm font-semibold text-slate-800">
            <legend className="mb-2 text-xs text-slate-500">{de ? "Art des Termins" : "Event type"}</legend>
            <label className="flex items-center gap-2"><input type="radio" checked={kind === "match"} onChange={() => setKind("match")} />{de ? "Spiel" : "Match"}</label>
            <label className="flex items-center gap-2"><input type="radio" checked={kind === "event"} onChange={() => setKind("event")} />Event</label>
          </fieldset>
          <label className="block text-xs font-semibold text-slate-700">
            {kind === "match" ? (de ? "Begegnung" : "Fixture") : (de ? "Event-Titel" : "Event title")}
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} placeholder={kind === "match" ? "SKV Rutesheim – TSV Münchingen" : ""} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
          </label>
          {kind === "match" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-slate-700">{de ? "Tore eigenes Team" : "Our goals"}
                <input type="number" min={0} max={999} inputMode="numeric" value={scoreFor} onChange={e => setScoreFor(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-semibold text-slate-700">{de ? "Tore Gegner" : "Opponent goals"}
                <input type="number" min={0} max={999} inputMode="numeric" value={scoreAgainst} onChange={e => setScoreAgainst(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
              </label>
            </div>
          ) : null}
          <label className="block text-xs font-semibold text-slate-700">{de ? "Kurzbericht (optional)" : "Short report (optional)"}
            <textarea value={report} onChange={e => setReport(e.target.value)} maxLength={500} rows={3} className="mt-1 block w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-semibold text-slate-700">{kind === "match" ? (de ? "Spiel- oder Siegerfoto (optional)" : "Match photo (optional)") : (de ? "Event-Foto (optional)" : "Event photo (optional)")}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={e => { setFile(e.target.files?.[0] ?? null); setDeletePhoto(false); }} className="mt-1 block w-full text-sm font-normal" />
          </label>
          {photoUrl ? <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={deletePhoto} onChange={e => { setDeletePhoto(e.target.checked); if (e.target.checked) setFile(null); }} />{de ? "Vorhandenes Foto entfernen" : "Remove existing photo"}</label> : null}
          <p className="text-xs text-slate-500">{de ? "Dieser Bericht zählt nicht für Siege, Punkte, MVP oder Badges." : "This report does not affect wins, points, MVP or badges."}</p>
          <button type="submit" disabled={saving} className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
            {saving ? (de ? "Speichert …" : "Saving …") : (de ? "Spielbericht speichern" : "Save report")}
          </button>
        </form>
      ) : null}
    </section>
  );
}
