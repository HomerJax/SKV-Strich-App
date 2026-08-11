import Link from "next/link";

type PlayerSettingsCardProps = {
  useStrength: boolean;
  strengthDefault: number | null;
  useCategories: boolean;
  categoryCount: number;
  categoryLabels?: string[];
  activePlayerCount?: number;
  missingCategoryCount?: number;
  missingPositionCount?: number;
  defaultStrengthCount?: number;
  balanceGroupCount?: number;
  className?: string;
};

function StatusCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs leading-5 text-slate-600">{hint}</div>
    </div>
  );
}

function ReadinessRow({
  label,
  count,
  okText,
  warningText,
}: {
  label: string;
  count: number;
  okText: string;
  warningText: string;
}) {
  const ok = count === 0;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-sm ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-amber-200 bg-amber-50 text-amber-950"
      }`}
    >
      <div>
        <div className="font-semibold">{label}</div>
        <div className="mt-0.5 text-xs opacity-80">
          {ok ? okText : warningText}
        </div>
      </div>
      <div className="shrink-0 text-base font-extrabold">{ok ? "✓" : count}</div>
    </div>
  );
}

export default function PlayerSettingsCard({
  useStrength,
  strengthDefault,
  useCategories,
  categoryCount,
  categoryLabels = [],
  activePlayerCount = 0,
  missingCategoryCount = 0,
  missingPositionCount = 0,
  defaultStrengthCount = 0,
  balanceGroupCount = 0,
  className = "",
}: PlayerSettingsCardProps) {
  const firstCategory = categoryLabels[0] ?? null;
  const secondCategory = categoryLabels[1] ?? null;

  return (
    <section
      className={`rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
            Teamgenerator zuerst
          </div>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
            Sind die Grundlagen für faire Teams sauber?
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Der Generator nutzt nur anwesende Spieler und bewertet anschließend
            Kategorie, Stärke, Position und optional Balance-Gruppen. Die
            Teamgrößen unterscheiden sich dabei höchstens um einen Spieler.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/settings"
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Generator-Regeln
          </Link>
          <Link
            href="/admin/categories"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Kategorien ordnen
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatusCard
          label="Generator-Spieler"
          value={String(activePlayerCount)}
          hint="Aktiv und als Spieler geführt; Staff landet nicht im Generator."
        />
        <StatusCard
          label="Kategorien"
          value={useCategories ? `${categoryCount} aktiv` : "Aus"}
          hint={
            useCategories
              ? "Für die sportliche Team-Balance werden maximal zwei Kategorien verwendet."
              : "Der Generator arbeitet ohne Kategoriegewichtung."
          }
        />
        <StatusCard
          label="Stärke"
          value={useStrength ? "Aktiv" : "Aus"}
          hint={
            useStrength
              ? `Spieler ohne Einzelwert nutzen den Standard ${strengthDefault ?? 3}.`
              : "Die individuelle Spielstärke fließt nicht ein."
          }
        />
      </div>

      {useCategories ? (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-bold text-blue-950">
            Kategorie-Reihenfolge ist wichtig
          </div>
          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-white/80 px-3 py-2 text-blue-950 ring-1 ring-blue-100">
              <span className="font-bold">1. Kategorie:</span>{" "}
              {firstCategory ?? "nicht gesetzt"} → stärkere Kategorie
            </div>
            <div className="rounded-xl bg-white/80 px-3 py-2 text-blue-950 ring-1 ring-blue-100">
              <span className="font-bold">2. Kategorie:</span>{" "}
              {secondCategory ?? "nicht gesetzt"} → normale Kategorie
            </div>
          </div>
          <p className="mt-2 text-xs leading-5 text-blue-900">
            Die individuelle Stärke 1–5 feinjustiert innerhalb dieser Einordnung.
            Wenn eure Kategorien keine sportliche Stärke ausdrücken, Kategorien
            im Generator besser deaktivieren und nur mit Stärke arbeiten.
          </p>

          {categoryCount > 2 ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-950">
              Achtung: Es sind {categoryCount} Kategorien aktiv. Die eigentliche
              sportliche Kategoriegewichtung ist bewusst auf die ersten zwei
              Kategorien ausgelegt.
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {useCategories ? (
          <ReadinessRow
            label="Kategorie gepflegt"
            count={missingCategoryCount}
            okText="Alle aktiven Generator-Spieler sind zugeordnet."
            warningText={`${missingCategoryCount} aktive Spieler haben noch keine Kategorie.`}
          />
        ) : null}

        <ReadinessRow
          label="Position gepflegt"
          count={missingPositionCount}
          okText="Alle aktiven Generator-Spieler haben eine Position."
          warningText={`${missingPositionCount} aktive Spieler stehen noch auf „Offen“.`}
        />

        {useStrength ? (
          <ReadinessRow
            label="Individuelle Stärke"
            count={defaultStrengthCount}
            okText="Alle aktiven Generator-Spieler haben einen Einzelwert."
            warningText={`${defaultStrengthCount} Spieler nutzen aktuell den Standardwert ${strengthDefault ?? 3}.`}
          />
        ) : null}

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm text-violet-950">
          <div>
            <div className="font-semibold">Balance-Gruppen</div>
            <div className="mt-0.5 text-xs opacity-80">
              Sonderprofile möglichst gleichmäßig auf beide Teams verteilen.
            </div>
          </div>
          <div className="shrink-0 text-base font-extrabold">{balanceGroupCount}</div>
        </div>
      </div>

      <details className="group mt-5 rounded-2xl border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">
              So arbeitet der Generator
            </div>
            <div className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200 transition group-open:rotate-180">
              ⌄
            </div>
          </div>
        </summary>

        <div className="border-t border-slate-200 px-4 py-4 text-sm leading-6 text-slate-600">
          <ol className="space-y-2">
            <li>
              <strong className="text-slate-900">1.</strong> Nur anwesende
              Spieler mit Rolle „Spieler“ kommen in die Auswahl.
            </li>
            <li>
              <strong className="text-slate-900">2.</strong> Bei ungerader Zahl
              entsteht automatisch z. B. 5 gegen 4 – nie ein größerer Unterschied.
            </li>
            <li>
              <strong className="text-slate-900">3.</strong> Torhüter werden
              zuerst verteilt. Danach bewertet strikr Kategorie, Stärke und
              Positionsmix.
            </li>
            <li>
              <strong className="text-slate-900">4.</strong> Gleiche
              Balance-Gruppen werden möglichst auf beide Teams verteilt. Sie sind
              kein zusätzlicher Stärkewert.
            </li>
            <li>
              <strong className="text-slate-900">5.</strong> Pro Generierung
              werden 400 Varianten ausprobiert und die beste gefundene
              Kombination übernommen. Danach kannst du immer manuell korrigieren.
            </li>
          </ol>
        </div>
      </details>
    </section>
  );
}
