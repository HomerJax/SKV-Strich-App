"use client";

import { useFormStatus } from "react-dom";

type SessionType = "training" | "event";

type SessionTypeSwitcherProps = {
  sessionId: number;
  currentType: SessionType;
  action: (formData: FormData) => void | Promise<void>;
  disabled?: boolean;
};

function SubmitButton({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={[
        "rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-3.5",
        active
          ? "bg-neutral-900 text-white shadow-sm"
          : "bg-transparent text-neutral-600 hover:text-neutral-900",
        pending ? "cursor-not-allowed opacity-60" : "",
      ].join(" ")}
    >
      {pending ? "..." : label}
    </button>
  );
}

export default function SessionTypeSwitcher({
  sessionId,
  currentType,
  action,
  disabled = false,
}: SessionTypeSwitcherProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-neutral-900">Session-Typ</p>
        <p className="text-xs text-neutral-500">
          {currentType === "training"
            ? "Zählt als Training"
            : "Zählt nicht als Training"}
        </p>
      </div>

      {disabled ? (
        <div className="shrink-0 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-500">
          Deaktiviert
        </div>
      ) : (
        <div className="shrink-0 rounded-full bg-neutral-100 p-1">
          <div className="flex items-center gap-1">
            <form action={action}>
              <input type="hidden" name="sessionId" value={sessionId} />
              <input type="hidden" name="type" value="training" />
              <SubmitButton
                label="Training"
                active={currentType === "training"}
              />
            </form>

            <form action={action}>
              <input type="hidden" name="sessionId" value={sessionId} />
              <input type="hidden" name="type" value="event" />
              <SubmitButton
                label="Spiel / Termin"
                active={currentType === "event"}
              />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}