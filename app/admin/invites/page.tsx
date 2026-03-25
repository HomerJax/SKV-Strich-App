import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import InviteShareActions from "./InviteShareActions";

type InviteRow = {
  id: number;
  token: string;
  role: "admin" | "member";
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
  is_active: boolean;
};

type PageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "owner";
}

export default async function AdminInvitesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const { membership } = await requireClub();

  if (!isAdminRole(membership.role)) {
    redirect(AUTH_ROUTES.dashboard);
  }

  const supabase = await createClient();

  const { data: invitesData, error: invitesError } = await supabase
    .from("club_invites")
    .select("id, token, role, created_at, expires_at, used_at, is_active")
    .order("created_at", { ascending: false });

  if (invitesError) {
    throw new Error(
      `Einladungen konnten nicht geladen werden: ${invitesError.message}`
    );
  }

  const invites = (invitesData ?? []) as InviteRow[];
  const flashError = resolvedSearchParams?.error ?? "";
  const flashSuccess = resolvedSearchParams?.success ?? "";

  async function createInviteAction(formData: FormData) {
    "use server";

    const { membership } = await requireClub();

    if (!isAdminRole(membership.role)) {
      redirect(AUTH_ROUTES.dashboard);
    }

    const supabase = await createClient();

    const roleValue =
      String(formData.get("role") ?? "") === "admin" ? "admin" : "member";

    const expiresInDaysRaw = Number(formData.get("expiresInDays") ?? 14);
    const expiresInDays =
      Number.isFinite(expiresInDaysRaw) &&
      expiresInDaysRaw >= 0 &&
      expiresInDaysRaw <= 365
        ? expiresInDaysRaw
        : 14;

    const { error } = await supabase.rpc("create_club_invite", {
      p_role: roleValue,
      p_expires_in_days: expiresInDays,
    });

    if (error) {
      redirect(`/admin/invites?error=${encodeURIComponent(error.message)}`);
    }

    redirect("/admin/invites?success=Einladung%20wurde%20erstellt.");
  }

  async function deactivateInviteAction(formData: FormData) {
    "use server";

    const { clubId, membership } = await requireClub();

    if (!isAdminRole(membership.role)) {
      redirect(AUTH_ROUTES.dashboard);
    }

    const supabase = await createClient();
    const inviteId = Number(formData.get("inviteId") ?? 0);

    if (!Number.isFinite(inviteId) || inviteId <= 0) {
      redirect("/admin/invites?error=Ung%C3%BCltige%20Einladung.");
    }

    const { error } = await supabase
      .from("club_invites")
      .update({ is_active: false })
      .eq("id", inviteId)
      .eq("club_id", clubId);

    if (error) {
      redirect(`/admin/invites?error=${encodeURIComponent(error.message)}`);
    }

    redirect("/admin/invites?success=Einladung%20wurde%20deaktiviert.");
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Adminbereich
          </Link>
        </div>

        <div className="mb-6 rounded-[28px] border border-slate-800/10 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
            Einladungen
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Erzeuge Join-Links für neue Mitglieder deines Teams und teile sie
            direkt weiter.
          </p>
        </div>

        {flashSuccess ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {flashSuccess}
          </div>
        ) : null}

        {flashError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {flashError}
          </div>
        ) : null}

        <section className="mb-6 rounded-[24px] border border-slate-800/10 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">
            Neue Einladung
          </h2>

          <form action={createInviteAction} className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Rolle
              </label>
              <select
                name="role"
                defaultValue="member"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900"
              >
                <option value="member">Mitglied</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Gültig für Tage
              </label>
              <input
                name="expiresInDays"
                type="number"
                min={0}
                max={365}
                defaultValue="14"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900"
              />
              <p className="mt-1 text-xs text-slate-500">
                0 = läuft nicht automatisch ab
              </p>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Einladung erzeugen
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[24px] border border-slate-800/10 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">
            Bestehende Einladungen
          </h2>

          {invites.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Noch keine Einladungen vorhanden.
            </div>
          ) : (
            <div className="space-y-4">
              {invites.map((invite) => {
                const inviteUrl = `${baseUrl}/invite/${invite.token}`;
                const isUsed = !!invite.used_at;
                const roleLabel = invite.role === "admin" ? "Admin" : "Mitglied";

                return (
                  <div
                    key={invite.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1.1fr,1.4fr]">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          Rolle: {roleLabel}
                        </div>

                        <div className="mt-2 text-xs text-slate-500">
                          Erstellt am{" "}
                          {new Date(invite.created_at).toLocaleString("de-DE")}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Läuft ab:{" "}
                          {invite.expires_at
                            ? new Date(invite.expires_at).toLocaleString("de-DE")
                            : "nie"}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            {invite.is_active ? "aktiv" : "deaktiviert"}
                          </span>

                          {isUsed ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">
                              verwendet
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-800">
                          Einladungslink
                        </label>
                        <input
                          readOnly
                          value={inviteUrl}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
                        />

                        <InviteShareActions
                          inviteUrl={inviteUrl}
                          clubRoleLabel={roleLabel}
                        />
                      </div>
                    </div>

                    {!isUsed && invite.is_active ? (
                      <div className="mt-4 flex justify-end">
                        <form action={deactivateInviteAction}>
                          <input type="hidden" name="inviteId" value={invite.id} />
                          <button
                            type="submit"
                            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Einladung deaktivieren
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}