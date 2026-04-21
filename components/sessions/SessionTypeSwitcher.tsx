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
        "rounded-full px-4 py-2 text-sm font-semibold transition",
        active
          ? "bg-black text-white"
          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
        pending ? "cursor-not-allowed opacity-60" : "",
      ].join(" ")}
    >
      {pending ? "Speichert..." : label}
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
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-neutral-900">Session-Typ</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Trainings zählen normal in Flow, MVP und Stats. Spiele oder Termine
          kannst du als Event markieren, damit sie nicht wie ein Training behandelt werden.
        </p>
      </div>

      {disabled ? (
        <div className="rounded-xl bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
          Session Types sind für diesen Club aktuell noch nicht aktiviert.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <form action={action}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="type" value="training" />
            <SubmitButton label="🟢 Training" active={currentType === "training"} />
          </form>

          <form action={action}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="type" value="event" />
            <SubmitButton label="🔵 Spiel / Termin" active={currentType === "event"} />
          </form>
        </div>
      )}
    </div>
  );
}