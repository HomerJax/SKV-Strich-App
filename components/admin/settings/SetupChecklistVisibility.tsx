"use client";

import { useState } from "react";

export default function SetupChecklistVisibility({ storageKey }: { storageKey: string }) {
  const [restored, setRestored] = useState(false);
  return <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <h3 className="text-sm font-bold text-slate-950">Einrichtungs-Checkliste auf Home</h3>
    <p className="mt-1 text-xs text-slate-600">Falls du die Checkliste ausgeblendet hast, kannst du sie hier wieder anzeigen.</p>
    <button type="button" onClick={() => { window.localStorage.removeItem(storageKey); setRestored(true); }} className="mt-3 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">{restored ? "Checkliste wieder aktiviert" : "Checkliste wieder einblenden"}</button>
  </div>;
}
