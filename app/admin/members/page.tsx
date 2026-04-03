import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { ErrorMessage, SuccessMessage } from "./MembersMessages";
import type { InviteRow, MemberRow } from "./members-types";
import { formatDate, getMemberRoleLabel } from "./members-utils";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import InviteActions from "./InviteActions";

async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // in Server Components nicht benötigt
        },
      },
    }
  );
}

function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "owner";
}

function getRoleChipClass(role: string | null | undefined) {
  if (role === "owner") {
    return "bg-amber-100 text-amber-800";
  }

  if (role === "admin") {
    return "bg-slate-100 text-slate-700";
  }

  return "bg-sky-100 text-sky-700";
}

async function getRequestOrigin() {
  const headerStore = await headers();

  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost || headerStore.get("host");

  if (host) {
    return `${forwardedProto || "https"}://${host}`;
  }

  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "";

  return envUrl.replace(/\/$/, "");
}

function buildAbsoluteInviteUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/join?token=${encodeURIComponent(token)}`;
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) || {};
  const created =
    typeof params.created === "string" ? params.created : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;
  const success =
    typeof params.success === "string" ? params.success : undefined;

  const supabase = await getSupabaseServerClient();
  const origin = await getRequestOrigin();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(AUTH_ROUTES.login);
  }

  const { data: membership, error: membershipError } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    redirect(AUTH_ROUTES.dashboard);
  }

  if (!isAdminRole(membership.role)) {
    redirect(AUTH_ROUTES.dashboard);
  }

  const [
    { data: members, error: membersError },
    { data: invites, error: invitesError },
  ] = await Promise.all([
    supabase.rpc("get_club_members_admin"),
    supabase
      .from("invites")
      .select("id, token, role, created_at, expires_at, accepted_at")
      .eq("club_id", membership.club_id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (membersError) {
    throw new Error(
      `Mitglieder konnten nicht geladen werden: ${membersError.message}`
    );
  }

  if (invitesError) {
    throw new Error(
      `Einladungen konnten nicht geladen werden: ${invitesError.message}`
    );
  }

  const memberRows = (members || []) as MemberRow[];
  const inviteRows = (invites || []) as InviteRow[];
  const createdInviteUrl = created
    ? buildAbsoluteInviteUrl(origin, created)
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6">
      <div className="flex items-center">
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
        >
          ← Zurück zum Adminbereich
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-sm text-slate-500">
          <Link href="/admin" className="hover:text-slate-700">
            Admin
          </Link>
          <span className="mx-2">/</span>
          <span>Mitglieder</span>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Mitglieder
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Verwalte Mitglieder, Rollen und Einladungen.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <form method="POST" action="/admin/members/create">
              <input type="hidden" name="role" value="member" />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                + Einladung erstellen
              </button>
            </form>

            <form method="POST" action="/admin/members/create">
              <input type="hidden" name="role" value="admin" />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                + Admin einladen
              </button>
            </form>
          </div>
        </div>
      </div>

      <SuccessMessage inviteUrl={createdInviteUrl} action={success} />
      <ErrorMessage code={error} />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Club-Mitglieder
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {memberRows.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-500">
              Keine Mitglieder gefunden.
            </div>
          ) : (
            memberRows.map((member) => {
              const isCurrentUser = member.user_id === user.id;
              const isOwner = member.role === "owner";
              const canChangeRole = !isCurrentUser && !isOwner;
              const canRemoveMember = !isCurrentUser && !isOwner;

              return (
                <div
                  key={member.user_id}
                  className="flex flex-col gap-4 px-5 py-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {member.full_name}
                        </div>

                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRoleChipClass(
                            member.role
                          )}`}
                        >
                          {getMemberRoleLabel(member.role)}
                        </span>

                        {isCurrentUser ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Du
                          </span>
                        ) : null}
                      </div>

                      <div className="truncate text-sm text-slate-500">
                        {member.email}
                      </div>
                    </div>

                    <div className="text-sm text-slate-500">
                      {getMemberRoleLabel(member.role)}
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Rolle
                      </div>

                      {canChangeRole ? (
                        <form
                          method="POST"
                          action="/admin/members/change-role"
                          className="flex flex-col gap-3 sm:flex-row sm:items-center"
                        >
                          <input
                            type="hidden"
                            name="userId"
                            value={member.user_id}
                          />

                          <select
                            name="role"
                            defaultValue={member.role}
                            className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                          >
                            <option value="member">Mitglied</option>
                            <option value="admin">Admin</option>
                          </select>

                          <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Rolle speichern
                          </button>
                        </form>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                          {isOwner
                            ? "Owner wird hier bewusst nicht zur Rollenänderung angeboten."
                            : "Deine eigene Rolle kannst du hier nicht ändern."}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Mitgliedschaft
                      </div>

                      {canRemoveMember ? (
                        <form method="POST" action="/admin/members/remove">
                          <input
                            type="hidden"
                            name="userId"
                            value={member.user_id}
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-2xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                          >
                            Mitglied entfernen
                          </button>
                        </form>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                          {isOwner
                            ? "Owner wird hier bewusst nicht entfernt."
                            : "Du kannst dich nicht selbst entfernen."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Offene Einladungen
          </h2>
        </div>

        {inviteRows.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">
            Aktuell gibt es keine offenen Einladungen.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {inviteRows.map((invite) => {
              const inviteUrl = buildAbsoluteInviteUrl(origin, invite.token);

              return (
                <div key={invite.id} className="flex flex-col gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {invite.role === "admin"
                          ? "Admin-Invite"
                          : "Member-Invite"}
                      </span>
                      <span className="text-xs text-slate-500">
                        Erstellt: {formatDate(invite.created_at)}
                      </span>
                      <span className="text-xs text-slate-500">
                        Läuft ab: {formatDate(invite.expires_at)}
                      </span>
                    </div>

                    <div className="break-all rounded-2xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                      {inviteUrl}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <InviteActions inviteUrl={inviteUrl} />

                    <form method="POST" action="/admin/members/revoke">
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Einladung löschen
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}