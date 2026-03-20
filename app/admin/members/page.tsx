import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import InviteActions from "./InviteActions";
import { getPlayerDisplayName } from "@/lib/player-display";
import { ErrorMessage, SuccessMessage } from "./MembersMessages";
import type {
  InviteRow,
  MemberRow,
  MemberWithPlayer,
  PlayerRow,
} from "./members-types";
import {
  buildInviteUrl,
  formatDate,
  sortPlayersByDisplayName,
} from "./members-utils";

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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    redirect("/sessions");
  }

  if (membership.role !== "admin") {
    redirect("/sessions");
  }

  const [
    { data: members, error: membersError },
    { data: invites, error: invitesError },
    { data: players, error: playersError },
  ] = await Promise.all([
    supabase.rpc("get_club_members_admin"),
    supabase
      .from("invites")
      .select("id, token, role, created_at, expires_at, accepted_at")
      .eq("club_id", membership.club_id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("players")
      .select("id, user_id, name, first_name, last_name, nickname, is_active")
      .eq("club_id", membership.club_id),
  ]);

  if (membersError) {
    throw new Error(`Members could not be loaded: ${membersError.message}`);
  }

  if (invitesError) {
    throw new Error(`Invites could not be loaded: ${invitesError.message}`);
  }

  if (playersError) {
    throw new Error(`Players could not be loaded: ${playersError.message}`);
  }

  const memberRows = (members || []) as MemberRow[];
  const inviteRows = (invites || []) as InviteRow[];
  const playerRows = sortPlayersByDisplayName((players || []) as PlayerRow[]);

  const playerByUserId = new Map<string, PlayerRow>();
  for (const player of playerRows) {
    if (player.user_id) {
      playerByUserId.set(player.user_id, player);
    }
  }

  const membersWithPlayer: MemberWithPlayer[] = memberRows.map((member) => {
    const linkedPlayer = playerByUserId.get(member.user_id);

    return {
      ...member,
      linkedPlayerId: linkedPlayer?.id ?? null,
      linkedPlayerName: linkedPlayer ? getPlayerDisplayName(linkedPlayer) : null,
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6">
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
              Verwalte Mitglieder, Rollen, Spieler-Verknüpfungen und Einladungen.
            </p>
          </div>

          <form method="POST" action="/admin/members/create">
            <input type="hidden" name="role" value="member" />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              + Einladung erstellen
            </button>
          </form>
        </div>
      </div>

      <SuccessMessage token={created} action={success} />
      <ErrorMessage code={error} />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Club-Mitglieder
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {membersWithPlayer.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-500">
              Keine Mitglieder gefunden.
            </div>
          ) : (
            membersWithPlayer.map((member) => {
              const isCurrentUser = member.user_id === user.id;

              const selectablePlayers = playerRows.filter(
                (player) =>
                  player.user_id === null || player.user_id === member.user_id
              );

              return (
                <div
                  key={member.user_id}
                  className="flex flex-col gap-4 px-5 py-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {member.full_name}{" "}
                        {member.role === "admin" && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            Admin
                          </span>
                        )}
                        {isCurrentUser && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Du
                          </span>
                        )}
                      </div>
                      <div className="truncate text-sm text-slate-500">
                        {member.email}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Verknüpfter Spieler:{" "}
                        <span className="font-medium text-slate-700">
                          {member.linkedPlayerName ?? "Keiner"}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-slate-500">
                      {member.role === "admin" ? "Administrator" : "Mitglied"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Spieler-Verknüpfung
                    </div>

                    <form
                      method="POST"
                      action="/admin/members/link-player"
                      className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                    >
                      <input type="hidden" name="userId" value={member.user_id} />

                      <div className="flex-1">
                        <select
                          name="playerId"
                          defaultValue={
                            member.linkedPlayerId
                              ? String(member.linkedPlayerId)
                              : ""
                          }
                          className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                        >
                          <option value="">— Kein Spieler verknüpft —</option>
                          {selectablePlayers.map((player) => (
                            <option key={player.id} value={player.id}>
                              {getPlayerDisplayName(player)}
                              {player.is_active === false ? " (inaktiv)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Spieler speichern
                      </button>
                    </form>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <form
                      method="POST"
                      action="/admin/members/change-role"
                      className="flex flex-col gap-3 sm:flex-row sm:items-center"
                    >
                      <input type="hidden" name="userId" value={member.user_id} />

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

                    <form method="POST" action="/admin/members/remove">
                      <input type="hidden" name="userId" value={member.user_id} />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-2xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                      >
                        Mitglied entfernen
                      </button>
                    </form>
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
              const inviteUrl = buildInviteUrl(invite.token);

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