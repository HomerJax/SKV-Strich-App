import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import ProfileForm from "./ProfileForm";
import ProfilePasswordForm from "./ProfilePasswordForm";
import PushPreferencesForm from "./PushPreferencesForm";

type ProfilePageProps = {
  searchParams?: Promise<{
    account_delete_error?: string;
  }>;
};

type ClubRow = {
  id: string;
  display_name: string | null;
  name: string | null;
};

function getClubLabel(club: ClubRow | null | undefined) {
  return club?.display_name ?? club?.name ?? null;
}

function getAccountDeleteErrorMessage(error?: string) {
  switch (error) {
    case "confirmation":
      return 'Bitte gib exakt „KONTO LÖSCHEN“ ein und bestätige die Checkbox.';
    case "sole_admin":
      return "Du bist noch alleiniger Admin eines Clubs. Übertrage zuerst die Admin-Rolle oder lösche den Club.";
    case "delete_failed":
      return "Dein Konto konnte nicht vollständig gelöscht werden. Bitte versuche es erneut.";
    default:
      return "";
  }
}

export default async function ProfilePage({
  searchParams,
}: ProfilePageProps) {
  const resolvedSearchParams = await searchParams;
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
  const accountDeleteError = getAccountDeleteErrorMessage(
    resolvedSearchParams?.account_delete_error
  );

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

      <PushPreferencesForm />

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

      <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
        <div className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
          Gefahrenbereich
        </div>

        <h2 className="mt-3 text-xl font-extrabold tracking-tight text-slate-950">
          Konto dauerhaft löschen
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-700">
          Dein Login und deine persönlichen Daten werden gelöscht. Bereits
          abgeschlossene Teamstatistiken bleiben nur anonymisiert als
          „Gelöschter Spieler“ erhalten.
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-700">
          Bist du alleiniger Admin eines Clubs, musst du vorher einen anderen
          Admin bestimmen oder den Club im Adminbereich löschen.
        </p>

        {accountDeleteError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {accountDeleteError}
          </div>
        ) : null}

        <form
          method="post"
          action="/api/account/delete"
          className="mt-5 space-y-4"
        >
          <div>
            <label
              htmlFor="account_delete_confirmation"
              className="block text-sm font-semibold text-slate-900"
            >
              Zur Bestätigung „KONTO LÖSCHEN“ eingeben
            </label>
            <input
              id="account_delete_confirmation"
              name="confirmation"
              type="text"
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition focus:border-rose-500"
              placeholder="KONTO LÖSCHEN"
            />
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3">
            <input
              type="checkbox"
              name="acknowledgement"
              value="1"
              className="mt-1 h-4 w-4 rounded border-rose-300"
            />
            <span className="text-sm leading-6 text-rose-900">
              Mir ist bewusst, dass dieser Vorgang nicht rückgängig gemacht
              werden kann.
            </span>
          </label>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700"
          >
            Konto dauerhaft löschen
          </button>
        </form>
      </section>
    </main>
  );
}
