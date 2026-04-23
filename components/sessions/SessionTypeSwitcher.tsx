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
        "rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none transition",
        embedded
          ? active
            ? "bg-white text-slate-950 shadow-sm"
            : "bg-transparent text-white/68 hover:text-white"
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
    ? "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/8 p-1"
    : "inline-flex items-center gap-1 rounded-full bg-slate-100 p-1";

  const disabledClass = embedded
    ? "rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] font-medium leading-none text-white/55"
    : "rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium leading-none text-neutral-500";

  return (
    <div className="flex items-center">
      {disabled ? (
        <div className={disabledClass}>Deaktiviert</div>
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
              label="Event"
              active={currentType === "event"}
              embedded={embedded}
            />
          </form>
        </div>
      )}
    </div>
  );
}