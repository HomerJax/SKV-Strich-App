import Link from "next/link";
import { requireAppAccess } from "@/lib/auth/gate";

export default async function AdminPage() {
  const access = await requireAppAccess();
  const activeMembership = access.memberships.find(
    (membership) => membership.club_id === access.activeClubId
  );

  const roleLabel =
    activeMembership?.role === "admin" ? "Admin" : "Mitglied";

  const clubName =
    access.player?.club_id && access.activeClubId
      ? "Dein Club"
      : "Dein Club";

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-slate-800/10 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Adminbereich
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {clubName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Verwalte Mitglieder, Einladungen, Spieler, Einstellungen und
                Club-Branding für deinen aktuell aktiven Club.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
              <div className="text-sm font-medium">Rolle im aktiven Club:</div>
              <div className="mt-1 text-2xl font-bold">{roleLabel}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <Link
            href="/admin/invites"
            className="rounded-[24px] border border-slate-800/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-semibold text-slate-900">
              Einladungen
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Erzeuge Einladungslinks, kopiere sie oder teile sie direkt per
              WhatsApp, E-Mail oder über die Teilen-Funktion deines Geräts.
            </p>
          </Link>

          <Link
            href="/admin/players"
            className="rounded-[24px] border border-slate-800/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-semibold text-slate-900">Spieler</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Spieler verwalten, Rollen prüfen und Gastspieler sinnvoll im
              Teamkontext pflegen.
            </p>
          </Link>

          <Link
            href="/admin/settings"
            className="rounded-[24px] border border-slate-800/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-semibold text-slate-900">
              Einstellungen
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Saisonlogik, Kategorien, Positionslabels und Teamgenerator-Optionen
              für diesen Club anpassen.
            </p>
          </Link>

          <Link
            href="/admin/club"
            className="rounded-[24px] border border-slate-800/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-semibold text-slate-900">
              Club &amp; Branding
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Clubname, Logo und visuelle Darstellung des aktuell aktiven Clubs
              verwalten.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}