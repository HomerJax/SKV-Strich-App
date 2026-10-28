"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

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
  hideNext?: boolean;
  helperText?: string | null;
  beforeContent?: ReactNode;
  children: ReactNode;
  fullscreen?: boolean;
  onClose?: () => void;
  overlayContent?: ReactNode;
};

export default function TrainingSessionWizard({
  steps, selectedIndex, completed, onSelect, onBack, onNext,
  nextDisabled, nextLabel, hideNext = false, helperText, beforeContent, children,
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
        <p className="mt-1 text-xs leading-5 text-slate-300">{current.summary}</p>
      </div>

      <main className="space-y-4 px-3 pb-6 pt-4 sm:px-6">
        {completed ? (
          <section className="space-y-3 rounded-2xl border border-teal-200 bg-white p-4" aria-label="Abgeschlossene Trainingsschritte">
            <p role="status" className="text-sm font-black text-teal-900">✓ Training abgeschlossen – alle Schritte bleiben erreichbar.</p>
            <p className="text-xs text-slate-600">Wähle einen Schritt zum Nachsehen. Bereits gespeicherte Ergebnisse werden dadurch nicht zurückgesetzt. Für Korrekturen kannst du auch die Datenansicht öffnen.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {steps.map((step, index) => (
                <button key={step.key} type="button" onClick={() => onSelect(index)}
                  aria-current={index === selectedIndex ? "step" : undefined}
                  className={`min-h-12 rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${index === selectedIndex
                    ? "border-teal-500 bg-teal-50 text-teal-950"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-300"}`}>
                  {step.done ? "✓ " : "· "}{step.title}
                </button>
              ))}
            </div>
          </section>
        ) : null}
        {helperText ? (
          <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-6 text-amber-900">
            {helperText}
          </p>
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
          {!hideNext ? <button
            type="button"
            disabled={nextDisabled}
            onClick={onNext}
            className="min-h-14 min-w-0 flex-1 rounded-xl bg-teal-400 px-4 py-3 text-sm font-black text-slate-950 shadow-sm transition hover:bg-teal-300 focus-visible:outline-2 focus-visible:outline-teal-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {nextLabel}
          </button> : null}
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
      <header className="relative z-10 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Image src="/icon-light.png" width={42} height={42} alt="strikr Logo" className="h-10 w-10 rounded-xl object-contain" priority />
            <div>
              <div className="text-lg font-black tracking-[-0.045em] text-slate-950">strikr</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Trainings-Assistent</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 focus-visible:outline-2 focus-visible:outline-teal-500"
          >
            {completed ? "Zur Übersicht ×" : "Schließen ×"}
          </button>
        </div>
      </header>
      {wizard}
      {overlayContent}
    </div>,
    document.body,
  );
}
