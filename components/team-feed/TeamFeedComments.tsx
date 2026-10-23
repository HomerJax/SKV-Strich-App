"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import type { TeamFeedCommentPreview } from "@/lib/team-feed";

type Comment = TeamFeedCommentPreview;

export default function TeamFeedComments({
  feedId, initialComments, initialCommentCount = 0,
}: {
  feedId: string;
  initialComments?: Comment[];
  initialCommentCount?: number;
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments ?? []);
  const [count, setCount] = useState(initialCommentCount);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setComments(initialComments ?? []);
    setCount(initialCommentCount);
    setExpanded(false);
    setLoaded(false);
    setEditing(false);
    setDraft("");
    setError("");
  }, [feedId, initialComments, initialCommentCount]);

  const mine = comments.find((comment) => comment.mine);
  const shown = expanded ? comments : comments.slice(0, 2);
  const hiddenCount = Math.max(0, count - 2);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/team-feed/comments?feedId=${encodeURIComponent(feedId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Kommentare nicht verfügbar.");
      const result = await response.json() as {
        comments?: Comment[]; canModerate?: boolean;
      };
      const rows = result.comments ?? [];
      setComments(rows);
      setCount(rows.length);
      setCanModerate(result.canModerate === true);
      setLoaded(true);
      setError("");
    } catch {
      setError("Kommentare konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    if (expanded) {
      setExpanded(false);
      setEditing(false);
      return;
    }
    setExpanded(true);
    if (!loaded) await load();
  }

  async function save(action: "save" | "delete", targetUserId?: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/team-feed/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedId, action, text: draft, targetUserId }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Speichern fehlgeschlagen.");
      await load();
      setEditing(false);
      setDraft("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      <button type="button" onClick={() => void toggle()}
        aria-expanded={expanded}
        className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-700">
        <MessageCircle className="h-3.5 w-3.5"/>
        {count === 0
          ? "Kommentieren"
          : `${count} Kommentar${count === 1 ? "" : "e"}`}
        <span className="font-medium text-slate-500">
          {expanded ? "· Schließen" : count === 0 ? "" : "· Ansehen"}
        </span>
      </button>

      {shown.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {shown.map((comment) => (
            <div key={comment.userId}
              className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-xs">
              <span className="font-bold text-slate-800">
                {comment.name}{comment.mine ? " · Du" : ""}
              </span>
              <p className="mt-0.5 whitespace-pre-wrap break-words leading-5 text-slate-700">
                {comment.body}
              </p>
              {expanded && canModerate && !comment.mine && (
                <button type="button" disabled={busy}
                  className="mt-1 text-[10px] font-semibold text-rose-600"
                  onClick={() => void save("delete", comment.userId)}>
                  Als Admin entfernen
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!expanded && hiddenCount > 0 && (
        <button type="button" onClick={() => void toggle()}
          className="mt-2 text-[11px] font-bold text-cyan-700">
          + {hiddenCount} weitere{hiddenCount === 1 ? "n Kommentar" : " Kommentare"} anzeigen ↓
        </button>
      )}

      {expanded && (
        <div className="mt-3 space-y-2">
          {loading ? <p className="text-xs text-slate-500">Kommentare laden …</p> : null}
          {count === 0 && !loading ? (
            <p className="text-xs text-slate-500">Noch keine Kommentare. Mach den Anfang!</p>
          ) : null}
          {mine && !editing ? (
            <button type="button"
              onClick={() => { setDraft(mine.body); setEditing(true); }}
              className="text-[11px] font-semibold text-cyan-700">
              Meinen Kommentar bearbeiten
            </button>
          ) : null}
          {(!mine || editing) && (
            <div className="space-y-2">
              <textarea aria-label="Dein Kommentar" value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={200} rows={2} placeholder="Einmal deinen Senf dazugeben …"
                className="w-full rounded-xl border border-slate-200 bg-white p-2 text-base text-slate-900 sm:text-sm"/>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400">
                  {draft.length}/200 · Ein Kommentar pro Meldung
                </span>
                <button type="button" disabled={busy || !draft.trim()}
                  onClick={() => void save("save")}
                  className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                  Speichern
                </button>
              </div>
              {mine && (
                <button type="button" disabled={busy}
                  onClick={() => void save("delete")}
                  className="text-[11px] font-semibold text-rose-700">
                  Meinen Kommentar löschen
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}
    </div>
  );
}
