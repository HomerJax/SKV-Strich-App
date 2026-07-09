"use client";

type SessionScoreCardProps = {
  hasResult: boolean;
  saving: boolean;
  collapsed: boolean;
  goalsA: string;
  goalsB: string;
  onGoalsAChange: (value: string) => void;
  onGoalsBChange: (value: string) => void;
  onSaveResult: () => void;
  onDeleteResult: () => void;
  onToggleCollapsed: () => void;
  title?: string;
  description?: string;
};

function SummaryPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "muted";
}) {
  const className =
    tone === "success"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "muted"
        ? "bg-slate-100 text-slate-600"
        : "bg-white text-slate-700 ring-1 ring-slate-200";

  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}
    >
      {children}
    </div>
  );
}

function ControlButton({
  children,
  onClick,
  disabled = false,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "primary" | "danger";
}) {
  const className =
    tone === "primary"
      ? "bg-slate-950 text-white hover:bg-slate-800"
      : tone === "danger"
        ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold transition ${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

function ScoreInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-center text-2xl font-extrabold tracking-tight text-slate-950 outline-none transition focus:border-slate-500 disabled:bg-slate-50"
      />
    </label>
  );
}

export default function SessionScoreCard({
  hasResult,
  saving,
  collapsed,
  goalsA,
  goalsB,
  onGoalsAChange,
  onGoalsBChange,
  onSaveResult,
  onDeleteResult,
  onToggleCollapsed,
  title = "Ergebnis",
}: SessionScoreCardProps) {
  const hasCompleteScore = goalsA.trim() !== "" && goalsB.trim() !== "";

  if (collapsed) {
    return (
      <section className="rounded-[20px] border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={`flex w-full items-center justify-between gap-4 rounded-[20px] px-4 py-3.5 text-left transition ${
            hasResult ? "bg-emerald-50" : "hover:bg-slate-50/70"
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            {hasResult ? (
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                ✓
              </span>
            ) : (
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                4
              </span>
            )}

            <div className="min-w-0">
              <div
                className={`text-sm font-bold sm:text-base ${hasResult ? "text-emerald-950" : "text-slate-950"}`}
              >
                {hasResult ? "Ergebnis gespeichert" : title}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                {hasCompleteScore ? (
                  <SummaryPill tone={hasResult ? "success" : "default"}>
                    {goalsA}:{goalsB}
                  </SummaryPill>
                ) : (
                  <SummaryPill tone="muted">Noch kein Ergebnis</SummaryPill>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            Bearbeiten
          </div>
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-[20px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                4
              </div>

              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {title}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {hasResult ? (
                    <SummaryPill tone="success">Gespeichert</SummaryPill>
                  ) : (
                    <SummaryPill tone="muted">Offen</SummaryPill>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleCollapsed}
            className="shrink-0 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Kompakt anzeigen
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mx-auto grid max-w-sm grid-cols-[1fr_auto_1fr] items-end gap-3">
            <ScoreInput
              label="Team 1"
              value={goalsA}
              disabled={saving}
              onChange={onGoalsAChange}
            />

            <div className="pb-3 text-center text-xl font-bold text-slate-400">
              :
            </div>

            <ScoreInput
              label="Team 2"
              value={goalsB}
              disabled={saving}
              onChange={onGoalsBChange}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ControlButton
            onClick={onSaveResult}
            disabled={saving}
            tone="primary"
          >
            {saving
              ? "Speichert..."
              : hasResult
                ? "Ergebnis aktualisieren"
                : "Ergebnis speichern"}
          </ControlButton>

          {hasResult ? (
            <ControlButton
              onClick={onDeleteResult}
              disabled={saving}
              tone="danger"
            >
              Ergebnis löschen
            </ControlButton>
          ) : null}
        </div>
      </div>
    </section>
  );
}
