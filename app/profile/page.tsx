import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import ProfilePasswordForm from "./ProfilePasswordForm";

export default async function ProfilePage() {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    redirect("/login");
  }

  const name =
    ctx.player?.nickname?.trim() ||
    [ctx.player?.first_name, ctx.player?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Spieler";

  const activeMembership =
    ctx.memberships.find((membership) => membership.club_id === ctx.activeClubId) ??
    ctx.memberships[0] ??
    null;

  const role = activeMembership?.role ?? "member";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-950">
          Profil
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Deine Kontodaten und dein Passwort.
        </p>
      </div>

      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Konto
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs text-slate-500">Name</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {name}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">E-Mail</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {ctx.user.email ?? "—"}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Rolle</div>
              <div className="mt-1 text-sm font-semibold capitalize text-slate-900">
                {role}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Aktiver Club</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {ctx.activeClubId ?? "—"}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Warum Login?
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Der Login ist da, damit Einsätze, Teams und Ergebnisse sauber deinem
            Account zugeordnet werden können. So bleibt nachvollziehbar, wer
            dabei war und wer in welchem Team gespielt hat.
          </p>
        </section>

        <ProfilePasswordForm email={ctx.user.email ?? ""} />
      </div>
    </main>
  );
}