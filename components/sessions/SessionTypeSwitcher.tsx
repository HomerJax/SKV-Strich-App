"use client";

import { useFormStatus } from "react-dom";

type SessionType = "training" | "event";

type SessionTypeSwitcherProps = {
  sessionId: number;
  currentType: SessionType;
  action: (formData: FormData) => void | Promise<void>;
  disabled?: boolean;
  embedded?: boolean;
};

function SubmitButton({
  label,
  active,
  embedded,
}: {
  label: string;
  active: boolean;
  embedded?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={[
        "rounded-full px-3 py-1.5 text-xs font-semibold transition",
        embedded
          ? active
            ? "bg-white text-slate-950 shadow-sm"
            : "bg-transparent text-white/75 hover:text-white"
          : active
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
  embedded = false,
}: SessionTypeSwitcherProps) {
  const wrapperClass = embedded
    ? "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 p-1"
    : "inline-flex items-center gap-2 rounded-full bg-slate-100 p-1";

  const labelClass = embedded
    ? "text-xs font-medium text-white/75"
    : "text-xs font-medium text-slate-500";

  return (
    <div className="flex items-center gap-2">
      <span className={labelClass}>Typ</span>

      {disabled ? (
        <div
          className={
            embedded
              ? "rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/60"
              : "rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-500"
          }
        >
          Deaktiviert
        </div>
      ) : (
        <div className={wrapperClass}>
          <form action={action}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="type" value="training" />
            <SubmitButton
              label="Training"
              active={currentType === "training"}
              embedded={embedded}
            />
          </form>

          <form action={action}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="type" value="event" />
            <SubmitButton
              label="Spiel / Termin"
              active={currentType === "event"}
              embedded={embedded}
            />
          </form>
        </div>
      )}
    </div>
  );
}