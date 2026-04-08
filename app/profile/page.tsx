import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import ProfileForm from "./ProfileForm";
import ProfilePasswordForm from "./ProfilePasswordForm";

type ClubRow = {
  id: string;
  display_name: string | null;
  name: string | null;
};

function getClubLabel(club: ClubRow | null | undefined) {
  return club?.display_name ?? club?.name ?? null;
}

export default async function ProfilePage() {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    redirect(AUTH_ROUTES.login);
  }

  const supabase = await createClient();

  let activeClubName: string | null = null;

  if (ctx.activeClubId) {
    const { data: club } = await supabase
      .from("clubs")
      .select("id, display_name, name")
      .eq("id", ctx.activeClubId)
      .maybeSingle<ClubRow>();

    activeClubName = getClubLabel(club);
  }

  const activeMembership =
    ctx.memberships.find((membership) => membership.club_id === ctx.activeClubId) ??
    ctx.memberships[0] ??
    null;

  const role = activeMembership?.role ?? "member";
  const isPowerUser = ctx.isPowerUser;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <ProfileForm
        player={ctx.player}
        email={ctx.user.email ?? ""}
        activeClubName={activeClubName}
        activeClubId={ctx.activeClubId}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Kontoübersicht
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs text-slate-500">Aktiver Club</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {activeClubName ?? "—"}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {ctx.activeClubId ?? "Keine Club-ID gesetzt"}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500">Rolle im aktiven Club</div>
            <div className="mt-1 text-sm font-semibold capitalize text-slate-900">
              {role}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500">App-Rolle</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {isPowerUser ? "Super User" : "Standard"}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500">E-Mail</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {ctx.user.email ?? "—"}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Warum Login?
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          Der Login ist da, damit Einsätze, Teams und Ergebnisse sauber deinem
          Account zugeordnet werden können. So bleibt nachvollziehbar, wer dabei
          war und wer in welchem Team gespielt hat.
        </p>
      </section>

      <ProfilePasswordForm email={ctx.user.email ?? ""} />
    </main>
  );
}