import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { ChevronDown } from "lucide-react";
import { ErrorMessage, SuccessMessage } from "./MembersMessages";
import type { InviteRow, MemberRow } from "./members-types";
import { formatDate, getMemberRoleLabel } from "./members-utils";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import InviteActions from "./InviteActions";
import { getAuthContext } from "@/lib/auth/context";
import { buildAbsoluteInviteUrl } from "@/lib/invites/url";
import { setMemberPermissionAction } from "./permission-actions";
import { getServerI18n } from "@/lib/i18n/server";

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isAdminRole(role: string | null | undefined) {
  return role === "admin";
}

function getRoleChipClass(role: string | null | undefined) {
  if (role === "admin") {
    return "bg-slate-100 text-slate-700";
  }

  if (role === "power_user") {
    return "bg-violet-100 text-violet-700";
  }

  return "bg-sky-100 text-sky-700";
}

async function getRequestOrigin() {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "";

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  const headerStore = await headers();

  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost || headerStore.get("host");

  if (host) {
    return `${forwardedProto || "https"}://${host}`;
  }

  return "http://localhost:3000";
}


function buildFullName(player: {
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  email: string | null;
  user_id: string | null;
}, fallback: string) {
  const first = player.first_name?.trim() ?? "";
  const last = player.last_name?.trim() ?? "";
  const nickname = player.nickname?.trim() ?? "";
  const fullName = [first, last].filter(Boolean).join(" ").trim();

  if (nickname) return nickname;
  if (fullName) return fullName;
  if (player.email?.trim()) return player.email.trim();
  return player.user_id ?? fallback;
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, t } = await getServerI18n();
  const params = (await searchParams) || {};
  const created =
    typeof params.created === "string" ? params.created : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;
  const success =
    typeof params.success === "string" ? params.success : undefined;

  const adminSupabase = getAdminSupabase();
  const origin = await getRequestOrigin();
  const ctx = await getAuthContext();

  if (!ctx.user) {
    redirect(AUTH_ROUTES.login);
  }

  if (!ctx.activeClubId) {
    redirect(AUTH_ROUTES.selectClub);
  }

  const activeMembership =
    ctx.memberships.find((membership) => membership.club_id === ctx.activeClubId) ??
    null;

  const hasAdminAccess =
    ctx.isPowerUser || isAdminRole(activeMembership?.role ?? null);

  if (!hasAdminAccess) {
    redirect(AUTH_ROUTES.dashboard);
  }

  const clubId = ctx.activeClubId;

  const [
    { data: memberships, error: membershipsError },
    { data: players, error: playersError },
    { data: invites, error: invitesError },
    { data: memberPermissions, error: memberPermissionsError },
  ] = await Promise.all([
    adminSupabase
      .from("club_memberships")
      .select("user_id, role")
      .eq("club_id", clubId)
      .order("role", { ascending: false }),
    adminSupabase
      .from("players")
      .select("user_id, first_name, last_name, nickname, email")
      .eq("club_id", clubId)
      .eq("is_guest", false),
    adminSupabase
      .from("invites")
      .select("id, token, role, created_at, expires_at, accepted_at")
      .eq("club_id", clubId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("club_member_permissions")
      .select("user_id,permission_key")
      .eq("club_id", clubId)
      .eq("permission_key", "manage_beerkasse"),
  ]);

  if (membershipsError) {
    throw new Error(
      t("members.loadMembershipsFailed", { error: membershipsError.message })
    );
  }

  if (playersError) {
    throw new Error(t("members.loadPlayersFailed", { error: playersError.message }));
  }

  if (invitesError) {
    throw new Error(
      t("members.loadInvitesFailed", { error: invitesError.message })
    );
  }

  if (memberPermissionsError) {
    throw new Error(
      t("members.loadPermissionsFailed", { error: memberPermissionsError.message })
    );
  }

  const beerManagerUserIds = new Set(
    (memberPermissions ?? []).map((permission) => String(permission.user_id)),
  );

  const playerByUserId = new Map<
    string,
    {
      user_id: string | null;
      first_name: string | null;
      last_name: string | null;
      nickname: string | null;
      email: string | null;
    }
  >();

  for (const player of players ?? []) {
    if (player.user_id) {
      playerByUserId.set(player.user_id, player);
    }
  }

  const memberRows: MemberRow[] = (memberships ?? []).map((membership) => {
    const player = playerByUserId.get(membership.user_id);

    return {
      user_id: membership.user_id,
      role: membership.role,
      email: player?.email ?? "",
      full_name:
        player != null
          ? buildFullName(player, t("members.unknownUser"))
          : membership.user_id ?? t("members.unknownUser"),
    };
  });

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
          ← {t("members.backAdmin")}
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-sm text-slate-500">
          <Link href="/admin" className="hover:text-slate-700">
            {t("members.breadcrumbAdmin")}
          </Link>
          <span className="mx-2">/</span>
          <span>{t("members.title")}</span>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {t("members.title")}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {t("members.description")}
            </p>

            {ctx.isPowerUser ? (
              <div className="mt-2 inline-flex rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800">
                {t("members.powerUserView")}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <form method="POST" action="/admin/members/create">
              <input type="hidden" name="role" value="member" />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                {t("members.createInvite")}
              </button>
            </form>

            <form method="POST" action="/admin/members/create">
              <input type="hidden" name="role" value="admin" />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {t("members.inviteAdmin")}
              </button>
            </form>
          </div>
        </div>
      </div>

      <SuccessMessage inviteUrl={createdInviteUrl} action={success} locale={locale} />
      <ErrorMessage code={error} locale={locale} />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {t("members.clubMembers")}
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {memberRows.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-500">
              {t("members.none")}
            </div>
          ) : (
            memberRows.map((member) => {
              const isCurrentUser = member.user_id === ctx.user?.id;
              const canChangeRole = !isCurrentUser;
              const canRemoveMember = !isCurrentUser;

              return (
                <details
                  key={member.user_id}
                  className="group px-5 py-2"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-3 py-3 transition hover:bg-slate-50 marker:hidden">
                    <div className="min-w-0 flex items-center gap-2">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {member.full_name}
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${getRoleChipClass(
                          member.role
                        )}`}
                      >
                        {getMemberRoleLabel(member.role, locale)}
                      </span>

                      {member.role === "admin" || beerManagerUserIds.has(member.user_id) ? (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          {t("members.beerFund")}
                        </span>
                      ) : null}

                      {isCurrentUser ? (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          {t("members.you")}
                        </span>
                      ) : null}
                    </div>

                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-open:rotate-180">
                      <ChevronDown className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                  </summary>

                  <div className="mt-2 rounded-2xl bg-slate-50 p-3">
                    <div className="mb-3 text-sm text-slate-500">
                      {member.email || t("members.noEmail")}
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
                      <div className="rounded-2xl bg-white p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t("members.role")}
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
                              defaultValue={member.role ?? "member"}
                              className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                            >
                              <option value="member">{t("members.roleMember")}</option>
                              <option value="admin">{t("members.roleAdmin")}</option>
                            </select>

                            <button
                              type="submit"
                              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              {t("members.saveRole")}
                            </button>
                          </form>
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            {t("members.cannotChangeOwnRole")}
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl bg-white p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t("members.extraRights")}
                        </div>

                        {member.role === "admin" ? (
                          <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                            {t("members.beerFund")} verwalten · automatisch als Admin
                          </div>
                        ) : (
                          <form action={setMemberPermissionAction} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{t("members.manageBeer")}</div>
                              <div className="mt-0.5 text-xs text-slate-500">
                                {t("members.manageBeerHint")}
                              </div>
                            </div>
                            <input type="hidden" name="user_id" value={member.user_id} />
                            <input
                              type="hidden"
                              name="enabled"
                              value={beerManagerUserIds.has(member.user_id) ? "0" : "1"}
                            />
                            <button
                              type="submit"
                              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black ${
                                beerManagerUserIds.has(member.user_id)
                                  ? "border border-rose-200 bg-rose-50 text-rose-700"
                                  : "bg-slate-950 text-white"
                              }`}
                            >
                              {beerManagerUserIds.has(member.user_id) ? t("members.removeRight") : t("members.grantRight")}
                            </button>
                          </form>
                        )}
                      </div>

                      <div className="rounded-2xl bg-white p-3 lg:col-span-2">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t("members.membership")}
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
                              {t("members.removeMember")}
                            </button>
                          </form>
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            {t("members.you")} kannst dich nicht selbst entfernen.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </details>
              );
            })
          )}
        </div>
      </section>

      <details className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 marker:hidden">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t("members.openInvites")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {inviteRows.length === 0
                ? t("members.noOpenInvites")
                : inviteRows.length === 1
                  ? t("members.openInviteCount", { count: inviteRows.length })
                  : t("members.openInvitesCount", { count: inviteRows.length })}
            </p>
          </div>

          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition group-open:rotate-180">
            <ChevronDown className="h-5 w-5" strokeWidth={2.2} />
          </span>
        </summary>

        <div className="border-t border-slate-200">
          {inviteRows.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-500">
              {t("members.noOpenInvites")}
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
                          {invite.role === "admin" ? t("members.adminInvite") : t("members.memberInvite")}
                        </span>
                        <span className="text-xs text-slate-500">
                          {t("members.createdAt", { date: formatDate(invite.created_at, locale) })}
                        </span>
                        <span className="text-xs text-slate-500">
                          {t("members.expiresAt", { date: formatDate(invite.expires_at, locale) })}
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
                          {t("members.deleteInvite")}
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}