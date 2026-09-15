"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSessionNotesAction } from "./session-notes-actions";

type Props = {
  sessionId: number;
  notes: string | null;
  isAdmin: boolean;
};

export default function SessionNoteEditor({ sessionId, notes, isAdmin }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) setValue(notes ?? "");
  }, [editing, notes]);

  function save() {
    setError(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("sessionId", String(sessionId));
        formData.set("notes", value);
        await updateSessionNotesAction(formData);
        setEditing(false);
        router.refresh();
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Hinweis konnte nicht gespeichert werden.",
        );
      }
    });
  }

  if (editing && isAdmin) {
    return (
      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/48">
            Hinweis bearbeiten
          </div>
          <div className="text-[10px] text-white/38">{value.length}/280</div>
        </div>

        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value.slice(0, 280))}
          rows={3}
          autoFocus
          placeholder="z. B. Training heute in der Halle"
          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm leading-5 text-white outline-none placeholder:text-white/28 focus:border-white/25"
        />

        {error ? <div className="mt-2 text-xs text-rose-300">{error}</div> : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-full bg-white px-3.5 py-2 text-xs font-bold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Speichert…" : "Speichern"}
          </button>
          <button
            type="button"
            onClick={() => {
              setValue(notes ?? "");
              setError(null);
              setEditing(false);
            }}
            disabled={pending}
            className="rounded-full bg-white/8 px-3.5 py-2 text-xs font-semibold text-white/74 ring-1 ring-white/10 transition hover:bg-white/12 disabled:opacity-60"
          >
            Abbrechen
          </button>
          {notes ? (
            <button
              type="button"
              onClick={() => {
                setValue("");
                setError(null);
              }}
              disabled={pending}
              className="ml-auto text-xs font-semibold text-white/42 transition hover:text-white/68 disabled:opacity-60"
            >
              Hinweis entfernen
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (!notes) {
    return isAdmin ? (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/66 ring-1 ring-white/10 transition hover:bg-white/12 hover:text-white"
      >
        <span aria-hidden="true">＋</span>
        Hinweis hinzufügen
      </button>
    ) : null;
  }

  return (
    <div className="mt-3 flex max-w-2xl items-start gap-2 rounded-2xl border border-amber-200/15 bg-amber-300/10 px-3.5 py-3 text-amber-50">
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        📍
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-100/55">
          Hinweis
        </div>
        <div className="mt-0.5 whitespace-pre-wrap text-sm leading-5 text-white/84">
          {notes}
        </div>
      </div>
      {isAdmin ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-white/70 ring-1 ring-white/10 transition hover:bg-white/12 hover:text-white"
        >
          Bearbeiten
        </button>
      ) : null}
    </div>
  );
}
