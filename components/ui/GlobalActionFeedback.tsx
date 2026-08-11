"use client";

import { useEffect } from "react";

const PENDING_TIMEOUT_MS = 15000;

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

export default function GlobalActionFeedback() {
  useEffect(() => {
    const timers = new WeakMap<HTMLFormElement, number>();

    function handleSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      if (form.dataset.actionPending === "true") {
        event.preventDefault();
        return;
      }

      const submitter = event.submitter;

      form.dataset.actionPending = "true";
      form.setAttribute("aria-busy", "true");

      if (submitter instanceof HTMLElement) {
        submitter.dataset.strikrSubmitPending = "true";
        submitter.setAttribute("aria-busy", "true");
      }

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
      document.querySelectorAll<HTMLFormElement>('form[data-action-pending="true"]')
        .forEach(clearPendingState);
    }

    document.addEventListener("submit", handleSubmit);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("submit", handleSubmit);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return null;
}
