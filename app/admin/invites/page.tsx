"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import InviteShareActions from "./InviteShareActions";

type MembershipRow = {
  club_id: string;
  role: "admin" | "member";
};

type InviteRow = {
  id: number;
  token: string;
  role: "admin" | "member";
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
  is_active: boolean;
};

function readCookie(name: string) {
  if (typeof document === "undefined") return null;

  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : null;
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function getBaseUrl() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export default function AdminInvitesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);

  const [clubId, setClubId] = useState<string | null>(null);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [role, setRole] = useState<"admin" | "member">("member");
  const [expiresInDays, setExpiresInDays] = useState("14");

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setIsLoading(true);
      setErrorMessage(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user ?? null;

      if (!user) {
        router.replace("/login");
        router.refresh();
        return;
      }

      const { data: membershipData, error: membershipError } = await supabase
        .from("club_memberships")
        .select("club_id, role")
        .eq("user_id", user.id);

      if (!isMounted) return;

      if (membershipError) {
        setErrorMessage("Deine Club-Mitgliedschaften konnten nicht geladen werden.");
        setIsLoading(false);
        return;
      }

      const memberships = (membershipData ?? []) as MembershipRow[];

      if (memberships.length === 0) {
        router.replace("/waiting-for-invite");
        router.refresh();
        return;
      }

      const activeClubIdFromCookie = readCookie("active_club_id");
      const validClubIds = new Set(memberships.map((membership) => membership.club_id));

      const activeClubId =
        memberships.length === 1
          ? memberships[0].club_id
          : activeClubIdFromCookie && validClubIds.has(activeClubIdFromCookie)
            ? activeClubIdFromCookie
            : null;

      if (!activeClubId) {
        router.replace("/select-club");
        router.refresh();
        return;
      }

      if (memberships.length === 1) {
        writeCookie("active_club_id", activeClubId);
      }

      const activeMembership =
        memberships.find((membership) => membership.club_id === activeClubId) ?? null;

      if (!activeMembership) {
        router.replace("/select-club");
        router.refresh();
        return;
      }

      if (activeMembership.role !== "admin") {
        router.replace("/");
        router.refresh();
        return;
      }

      const { data: invitesData, error: invitesError } = await supabase
        .from("club_invites")
        .select("id, token, role, created_at, expires_at, used_at, is_active")
        .eq("club_id", activeClubId)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (invitesError) {
        setErrorMessage(invitesError.message);
        setIsLoading(false);
        return;
      }

      setClubId(activeClubId);
      setInvites((invitesData ?? []) as InviteRow[]);
      setIsLoading(false);
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  async function reloadInvites(currentClubId: string) {
    const { data, error } = await supabase
      .from("club_invites")
      .select("id, token, role, created_at, expires_at, used_at, is_active")
      .eq("club_id", currentClubId)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setInvites((data ?? []) as InviteRow[]);
  }

  async function handleCreateInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!clubId || isCreating) return;

    setIsCreating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const safeDays = Number(expiresInDays);

      const { error } = await supabase.rpc("create_club_invite", {
        p_role: role,
        p_expires_in_days:
          Number.isFinite(safeDays) && safeDays >= 0 && safeDays <= 365 ? safeDays : 14,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsCreating(false);
        return;
      }

      await reloadInvites(clubId);
      setExpiresInDays("14");
      setRole("member");
      setSuccessMessage("Einladung wurde erstellt.");
    } catch {
      setErrorMessage("Einladung konnte nicht erstellt werden.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeactivateInvite(inviteId: number) {
    if (!clubId || deactivatingId) return;

    setDeactivatingId(inviteId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase
        .from("club_invites")
        .update({ is_active: false })
        .eq("id", inviteId)
        .eq("club_id", clubId);

      if (error) {
        setErrorMessage(error.message);
        setDeactivatingId(null);
        return;
      }

      await reloadInvites(clubId);
      setSuccessMessage("Einladung wurde deaktiviert.");
    } catch {
      setErrorMessage("Einladung konnte nicht deaktiviert werden.");
    } finally {
      setDeactivatingId(null);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-[24px] border border-black/10 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-neutral-600">Einladungen werden geladen...</p>
          </div>
        </section>
      </main>
    );
  }

  const baseUrl = getBaseUrl();

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-[28px] border border-slate-800/10 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
            Einladungen
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Erzeuge Join-Links für neue Mitglieder deines Clubs und teile sie direkt weiter.
          </p>
        </div>

        {successMessage ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="mb-6 rounded-[24px] border border-slate-800/10 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">
            Neue Einladung
          </h2>

          <form onSubmit={handleCreateInvite} className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Rolle
              </label>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value === "admin" ? "admin" : "member")}
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
                type="number"
                min={0}
                max={365}
                value={expiresInDays}
                onChange={(event) => setExpiresInDays(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900"
              />
              <p className="mt-1 text-xs text-slate-500">
                0 = läuft nicht automatisch ab
              </p>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isCreating}
                className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {isCreating ? "Wird erstellt..." : "Einladung erzeugen"}
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
                const isExpired = invite.expires_at
                  ? new Date(invite.expires_at).getTime() < Date.now()
                  : false;
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
                          Erstellt am {new Date(invite.created_at).toLocaleString("de-DE")}
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

                          {!isUsed && isExpired ? (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
                              abgelaufen
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
                        <button
                          type="button"
                          onClick={() => handleDeactivateInvite(invite.id)}
                          disabled={deactivatingId === invite.id}
                          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          {deactivatingId === invite.id
                            ? "Wird deaktiviert..."
                            : "Einladung deaktivieren"}
                        </button>
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