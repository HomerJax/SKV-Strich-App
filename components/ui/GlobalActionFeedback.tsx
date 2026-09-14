"use client";

import { useEffect, useState } from "react";

const PENDING_TIMEOUT_MS = 15000;
const FEEDBACK_VISIBLE_MS = 1800;

function clearPendingState(form: HTMLFormElement) {
  form.dataset.actionPending = "false";
  form.removeAttribute("aria-busy");

  const pendingButtons = form.querySelectorAll<HTMLElement>(
    '[data-strikr-submit-pending="true"]'
  );

  pendingButtons.forEach((button) => {
    button.dataset.strikrSubmitPending = "false";
    button.removeAttribute("aria-busy");
  });
}

function getPendingLabel(submitter: HTMLElement | null) {
  const text = submitter?.textContent?.trim().toLowerCase() ?? "";

  if (text.includes("anlegen") || text.includes("erstellen")) {
    return "Wird angelegt…";
  }

  if (text.includes("speichern")) {
    return "Wird gespeichert…";
  }

  if (text.includes("löschen")) {
    return "Wird gelöscht…";
  }

  if (text.includes("senden") || text.includes("einladen")) {
    return "Wird gesendet…";
  }

  return "Wird ausgeführt…";
}

export default function GlobalActionFeedback() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const timers = new WeakMap<HTMLFormElement, number>();
    let feedbackTimer: number | null = null;

    function showFeedback(nextMessage: string) {
      setMessage(nextMessage);

      if (feedbackTimer) {
        window.clearTimeout(feedbackTimer);
      }

      feedbackTimer = window.setTimeout(() => {
        setMessage(null);
        feedbackTimer = null;
      }, FEEDBACK_VISIBLE_MS);
    }

    function handleSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      if (form.dataset.actionPending === "true") {
        event.preventDefault();
        return;
      }

      const submitter = event.submitter instanceof HTMLElement ? event.submitter : null;

      form.dataset.actionPending = "true";
      form.setAttribute("aria-busy", "true");

      if (submitter) {
        submitter.dataset.strikrSubmitPending = "true";
        submitter.setAttribute("aria-busy", "true");
      }

      showFeedback(getPendingLabel(submitter));

      const previousTimer = timers.get(form);
      if (previousTimer) {
        window.clearTimeout(previousTimer);
      }

      const timer = window.setTimeout(() => {
        clearPendingState(form);
        timers.delete(form);
      }, PENDING_TIMEOUT_MS);

      timers.set(form, timer);
    }

    function handlePageShow() {
      document
        .querySelectorAll<HTMLFormElement>('form[data-action-pending="true"]')
        .forEach(clearPendingState);
      setMessage(null);
    }

    document.addEventListener("submit", handleSubmit);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("submit", handleSubmit);
      window.removeEventListener("pageshow", handlePageShow);
      if (feedbackTimer) window.clearTimeout(feedbackTimer);
    };
  }, []);

  if (!message) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(4.25rem+env(safe-area-inset-top))] z-[1200] flex justify-center px-4 sm:top-[calc(5.25rem+env(safe-area-inset-top))]"
      role="status"
      aria-live="polite"
    >
      <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-xl ring-1 ring-white/10">
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white"
        />
        {message}
      </div>
    </div>
  );
}
