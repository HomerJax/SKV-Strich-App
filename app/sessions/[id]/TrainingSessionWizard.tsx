"use client";

import { useEffect, useState, type ReactNode } from "react";
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
};

export default function TrainingSessionWizard({
  steps,
  selectedIndex,
  completed,
  onSelect,
  onBack,
  onNext,
  nextDisabled,
  nextLabel,
  helperText,
  beforeContent,
  children,
  fullscreen = false,
  onClose,
}: Props) {
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => { setPortalReady(true); }, []);
  useEffect(() => {
    if (!fullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", escape);
    };
  }, [fullscreen, onClose]);

  const selected = steps[selectedIndex];
  if (!selected) return null;

  const completeCount = steps.filter((step) => step.done).length;
  const canOpenStep = (index: number) =>
    index <= selectedIndex || steps.slice(0, index).every((step) => step.done);

  const wizard = (
    <section
      aria-label="Trainings-Assistent"
      className={fullscreen
        ? "mx-auto min-h-full w-full max-w-3xl bg-white sm:my-4 sm:min-h-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-xl"
        : "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.07)]"}
    >
      <div className="bg-slate-950 px-4 pb-4 pt-4 text-white sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.17em] text-teal-300">
            Dein Trainings-Assistent
          </span>
          <span className="shrink-0 text-xs font-semibold text-slate-300">
            {selectedIndex + 1} / {steps.length}
          </span>
        </div>

        <div className="mt-3 flex gap-1.5" aria-label="Fortschritt">
          {steps.map((step, index) => (
            <div
              key={step.key}
              className={
                "h-1.5 min-w-0 flex-1 rounded-full " +
                (step.done ? "bg-teal-400" : index === selectedIndex ? "bg-teal-200" : "bg-slate-700")
              }
            />
          ))}
        </div>
        <div className="mt-2 text-xs text-slate-300">
          {completeCount} von {steps.length} Schritten erledigt
        </div>
        <h2 className="mt-3 text-xl font-black leading-tight tracking-tight" aria-live="polite">
          {selected.title}
        </h2>
        <p className="mt-1 text-sm text-slate-300">{selected.summary}</p>
      </div>

      <nav
        aria-label="Trainingsschritte"
        className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50 px-3 py-3 sm:px-4"
      >
        {steps.map((step, index) => {
          const active = index === selectedIndex;
          const unlocked = canOpenStep(index);
          return (
            <button
              key={step.key}
              type="button"
              disabled={!unlocked}
              onClick={() => onSelect(index)}
              aria-current={active ? "step" : undefined}
              className={
                "min-w-[104px] flex-1 rounded-xl border px-2.5 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 disabled:cursor-not-allowed disabled:opacity-50 " +
                (active
                  ? "border-teal-500 bg-white text-slate-950 shadow-sm"
                  : step.done
                    ? "border-teal-100 bg-teal-50 text-teal-900"
                    : "border-slate-200 bg-white text-slate-500")
              }
            >
              <span className="block text-[10px] font-black uppercase tracking-wide">
                {step.done ? "✓ Erledigt" : active ? "Jetzt dran" : "Schritt " + (index + 1)}
              </span>
              <span className="mt-1 block text-xs font-bold leading-4">{step.title}</span>
              {step.optional ? (
                <span className="mt-1 block text-[10px] font-medium opacity-70">Optional</span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="space-y-4 px-3 py-4 sm:px-5">
        {completed ? (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
            ✓ Training abgeschlossen. Du kannst die Schritte weiterhin ansehen und bearbeiten.
          </div>
        ) : null}
        {helperText ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-5 text-slate-700">
            {helperText}
          </div>
        ) : null}
        {beforeContent}
        <div className="min-w-0 space-y-3">{children}</div>

        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">
          {selectedIndex > 0 ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-500 sm:w-1/3"
            >
              ← Zurück
            </button>
          ) : null}
          <button
            type="button"
            disabled={nextDisabled}
            onClick={onNext}
            className="min-h-12 flex-1 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-teal-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </section>
  );

  if (!fullscreen) return wizard;
  if (!portalReady) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Training durchführen"
      className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain bg-slate-100"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-[0.13em] text-teal-700">strikr</div>
            <div className="text-sm font-bold text-slate-950">Training durchführen</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-500"
          >
            Schließen ×
          </button>
        </div>
      </header>
      {wizard}
    </div>,
    document.body,
  );
}
