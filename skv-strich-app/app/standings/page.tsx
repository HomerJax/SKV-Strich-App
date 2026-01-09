import { Suspense } from "react";
import StandingsClient from "./StandingsClient";

export default function StandingsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-slate-500">Lade…</div>}>
      <StandingsClient />
    </Suspense>
  );
}
