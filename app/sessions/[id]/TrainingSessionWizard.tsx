"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type TrainingWizardStep = {
  key: string;
  title: string;
  summary: string;
  done: boolean;
  optional?: boolean;
};

type Props = {
  steps: TrainingWizardStep[];
  selectedIndex: number;
  completed: boolean;
  onSelect: (index: number) => void;
  onBack: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  nextLabel: string;
  helperText?: string | null;
  beforeContent?: ReactNode;
  children: ReactNode;
  fullscreen?: boolean;
  onClose?: () => void;
  overlayContent?: ReactNode;
};

export default function TrainingSessionWizard({
  steps, selectedIndex, completed, onSelect, onBack, onNext,
  nextDisabled, nextLabel, helperText, beforeContent, children,
  fullscreen = false, onClose, overlayContent,
}: Props) {
  const [portalReady, setPortalReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setPortalReady(true); }, []);
  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onEscape);
    };
  }, [fullscreen, onClose]);

  useEffect(() => {
    if (fullscreen) containerRef.current?.scrollTo({ top: 0 });
  }, [selectedIndex, fullscreen]);

  const current = steps[selectedIndex];
  if (!current) return null;
  const completeCount = steps.filter((step) => step.done).length;

  const wizard = (
    <section
      aria-label="Trainings-Assistent"
      className={fullscreen
        ? "mx-auto min-h-full w-full max-w-3xl bg-slate-50 pb-28"
        : "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"}
    >
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 px-5 pb-5 pt-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-300">
            Schritt {selectedIndex + 1} von {steps.length}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">
            {completeCount} erledigt
          </span>
        </div>
        <div className="mt-4 flex gap-1.5" aria-label="Trainingsfortschritt">
          {steps.map((step, index) => (
            <div
              key={step.key}
              className={"h-1.5 min-w-0 flex-1 rounded-full transition-colors " +
                (step.done ? "bg-teal-400" : index === selectedIndex ? "bg-white" : "bg-white/20")}
            />
          ))}
        </div>
        <h1 className="mt-4 text-2xl font-black leading-tight tracking-tight sm:text-3xl" aria-live="polite">
          {current.title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">{current.summary}</p>
      </div>

      <div className="border-b border-slate-100 bg-white px-5 py-3 text-center text-xs font-semibold text-slate-500">
        Eine Aufgabe nach der anderen. Mit Zurück kannst du jeden Schritt erneut prüfen.
      </div>

      <main className="space-y-4 px-3 pb-6 pt-4 sm:px-6">
        {completed ? (
          <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
            ✓ Training abgeschlossen. Gespeicherte Schritte kannst du erneut ansehen und bearbeiten.
          </div>
        ) : null}
        {helperText ? (
          <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm leading-6 text-slate-700">
            {helperText}
          </div>
        ) : null}
        {beforeContent}
        <div className="min-w-0 space-y-4">{children}</div>
      </main>

      <footer className={fullscreen
        ? "fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur"
        : "border-t border-slate-200 bg-white px-4 py-4"}
      >
        <div className="mx-auto flex max-w-3xl gap-2">
          {selectedIndex > 0 ? (
            <button
              type="button"
              onClick={onBack}
              className="min-h-13 shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-500"
            >
              ← Zurück
            </button>
          ) : null}
          <button
            type="button"
            disabled={nextDisabled}
            onClick={onNext}
            className="min-h-14 min-w-0 flex-1 rounded-xl bg-teal-400 px-4 py-3 text-sm font-black text-slate-950 shadow-sm transition hover:bg-teal-300 focus-visible:outline-2 focus-visible:outline-teal-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {nextLabel}
          </button>
        </div>
      </footer>
    </section>
  );

  if (!fullscreen) return wizard;
  if (!portalReady) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Training durchführen"
      ref={containerRef}
      className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain bg-slate-50"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-xl font-black text-teal-300">
              S
            </span>
            <div>
              <div className="text-xs font-extrabold uppercase tracking-[0.15em] text-teal-700">strikr</div>
              <div className="text-sm font-black text-slate-950">Trainings-Wizard</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 focus-visible:outline-2 focus-visible:outline-teal-500"
          >
            Schließen ×
          </button>
        </div>
      </header>
      {wizard}
      {overlayContent}
    </div>,
    document.body,
  );
}
