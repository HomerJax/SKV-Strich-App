export default function OnboardingExamples({ kind }: { kind: "teams" | "categories" }) {
  const teams = kind === "teams";
  return (
    <details className="group rounded-2xl border border-slate-200 bg-white p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-left text-sm font-bold text-cyan-800 [&::-webkit-details-marker]:hidden">
        {teams ? "Beispiel: So entstehen faire Teams" : "Beispiel: Kategorien verwenden"}
        <span aria-hidden="true" className="text-lg group-open:hidden">+</span>
        <span aria-hidden="true" className="hidden text-lg group-open:inline">−</span>
      </summary>
      <div className="mt-3">
        <p className="mb-3 text-xs leading-5 text-slate-600">
          {teams
            ? "Spielstärken helfen strikr, möglichst ausgeglichene Mannschaften zu bilden."
            : "Kategorien können zum Beispiel Jung und Alt unterscheiden – nicht Torhüter und Feldspieler. Die Positionen werden separat gepflegt. Namen und Zuordnungen lassen sich später ändern."}
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-cyan-50 p-3">
            <strong>{teams ? "Team Cyan" : "Jung"}</strong>
            <p className="mt-2">{teams ? "Alex (5) · Sam (3) · Kim (2)" : "Alex · Jo · Sam"}</p>
            {teams ? <strong className="mt-2 block">10 Punkte</strong> : null}
          </div>
          <div className="rounded-xl bg-slate-100 p-3">
            <strong>{teams ? "Team Navy" : "Alt"}</strong>
            <p className="mt-2">{teams ? "Jo (4) · Robin (4) · Pat (2)" : "Kim · Pat · Robin"}</p>
            {teams ? <strong className="mt-2 block">10 Punkte</strong> : null}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">Nur ein Beispiel – keine echten Spielerdaten.</p>
      </div>
    </details>
  );
}
