import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { requireClub } from "@/lib/auth/guards";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { canManageClub } from "@/lib/auth/access";

const standardFeatures = [
  "Persönliche Stats & Form",
  "Team Impact",
  "Spielfeldansicht",
  "Zu-/Absage auf dem Homescreen",
  "Training, Spiel & Orga-Termin als Session-Typen",
];

export default async function AdminFeaturesPage() {
  const { membership, isPowerUser } = await requireClub();

  const hasAdminAccess = canManageClub({
    isPowerUser,
    role: membership.role,
  });

  if (!hasAdminAccess) {
    redirect(AUTH_ROUTES.dashboard);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
        >
          ← Zurück zum Adminbereich
        </Link>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Admin
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          Features
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Die wichtigsten strikr-Funktionen sind inzwischen Produktstandard und
          müssen nicht mehr pro Club aktiviert werden.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {standardFeatures.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-950"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
          Noch nicht allgemein fertige Module wie <strong>Strafen</strong> sowie
          der aktuelle Rollout der <strong>Hall of Fame</strong> bleiben intern
          steuerbar. Das alte MVP-pro-Training-Voting ist deaktiviert und wird
          später als Halbserien-/Saison-Voting neu gedacht.
        </div>
      </section>
    </main>
  );
}
