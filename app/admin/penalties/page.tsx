import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import {
  addPenaltyAction,
  deletePenaltyAction,
  reopenPenaltyAction,
  resolvePenaltyAction,
} from "./actions";

type PageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
  }>;
};

type PlayerRow = {
  id: number;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  is_active: boolean | null;
};

type PenaltyRow = {
  id: number;
  player_id: number;
  reason: string | null;
  type: "beer" | "money" | "custom";
  value: string | null;
  created_at: string;
  due_date: string | null;
  resolved_at: string | null;
  notes: string | null;
};

function getPlayerDisplayName(player: PlayerRow) {
  const fullName = [player.first_name, player.last_name].filter(Boolean).join(" ").trim();

  return (
    player.nickname?.trim() ||
    fullName ||
    player.name?.trim() ||
    `Spieler ${player.id}`
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("de-DE");
}

function typeLabel(value: PenaltyRow["type"]) {
  switch (value) {
    case "money":
      return "Geld";
    case "custom":
      return "Custom";
    default:
      return "Kiste";
  }
}

export default async function AdminPenaltiesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const { clubId, membership, isPowerUser } = await requireClub();

  const hasAdminAccess = canManageClub({
    isPowerUser,
    role: membership.role,
  });

  if (!hasAdminAccess) {
    redirect("/admin");
  }

  const flags = await getFeatureFlagsForClub(clubId);

  if (!(flags.penalties ?? false)) {
    redirect("/admin");
  }

  const supabase = await createClient();

  const [{ data: playersData }, { data: penaltiesData }] = await Promise.all([
    supabase
      .from("players")
      .select("id, name, first_name, last_name, nickname, is_active")
      .eq("club_id", clubId)
      .eq("is_guest", false)
      .order("first_name", { ascending: true }),
    supabase
      .from("penalties")
      .select("id, player_id, reason, type, value, created_at, due_date, resolved_at, notes")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false }),
  ]);

  const players = (playersData ?? []) as PlayerRow[];
  const penalties = (penaltiesData ?? []) as PenaltyRow[];

  const playerMap = new Map(players.map((player) => [player.id, player]));
  const openPenalties = penalties.filter((entry) => !entry.resolved_at);
  const resolvedPenalties = penalties.filter((entry) => !!entry.resolved_at);

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
        <div className="flex items-center">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Adminbereich
          </Link>
        </div>

        <div className="rounded-[24px] border border-black/10 bg-white px-5 py-5 shadow-sm">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
            Strafen
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Kiste Bier, Geldstrafe oder Custom-Schulden für Hobby- und Amateurteams.
          </p>
        </div>

        {resolvedSearchParams?.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {resolvedSearchParams.error}
          </div>
        ) : null}

        {resolvedSearchParams?.saved === "1" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Änderungen gespeichert.
          </div>
        ) : null}

        <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-slate-950">
            Neue Strafe
          </h2>

          <form action={addPenaltyAction} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <div className="mb-1.5 text-sm font-medium text-slate-900">
                  Spieler
                </div>
                <select
                  name="player_id"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
                >
                  <option value="">Bitte wählen</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {getPlayerDisplayName(player)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <div className="mb-1.5 text-sm font-medium text-slate-900">
                  Typ
                </div>
                <select
                  name="type"
                  defaultValue="beer"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
                >
                  <option value="beer">Kiste / Bier</option>
                  <option value="money">Geld</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <div className="mb-1.5 text-sm font-medium text-slate-900">
                  Grund
                </div>
                <input
                  name="reason"
                  placeholder="z. B. Elfer verschossen"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
                />
              </label>

              <label className="block">
                <div className="mb-1.5 text-sm font-medium text-slate-900">
                  Wert
                </div>
                <input
                  name="value"
                  placeholder="z. B. Kiste Bier"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <div className="mb-1.5 text-sm font-medium text-slate-900">
                  Fällig bis
                </div>
                <input
                  name="due_date"
                  type="date"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
                />
              </label>

              <label className="block">
                <div className="mb-1.5 text-sm font-medium text-slate-900">
                  Notiz
                </div>
                <input
                  name="notes"
                  placeholder="optional"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
                />
              </label>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Strafe anlegen
            </button>
          </form>
        </div>

        <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-slate-950">
            Offen
          </h2>

          <div className="mt-4 space-y-3">
            {openPenalties.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-neutral-50 p-4 text-sm text-slate-500">
                Keine offenen Strafen.
              </div>
            ) : (
              openPenalties.map((penalty) => {
                const player = playerMap.get(penalty.player_id);

                return (
                  <div
                    key={penalty.id}
                    className="rounded-2xl border border-black/10 bg-white p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-base font-semibold text-slate-950">
                          {player ? getPlayerDisplayName(player) : `Spieler ${penalty.player_id}`}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {penalty.reason || "Ohne Grund"} · {typeLabel(penalty.type)}
                          {penalty.value ? ` · ${penalty.value}` : ""}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Angelegt: {formatDate(penalty.created_at)} · Fällig: {formatDate(penalty.due_date)}
                        </div>
                        {penalty.notes ? (
                          <div className="mt-2 text-xs text-slate-500">
                            Notiz: {penalty.notes}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <form action={resolvePenaltyAction}>
                          <input type="hidden" name="penalty_id" value={penalty.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
                          >
                            Eingelöst
                          </button>
                        </form>

                        <form action={deletePenaltyAction}>
                          <input type="hidden" name="penalty_id" value={penalty.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                          >
                            Löschen
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-slate-950">
            Erledigt
          </h2>

          <div className="mt-4 space-y-3">
            {resolvedPenalties.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-neutral-50 p-4 text-sm text-slate-500">
                Noch nichts erledigt.
              </div>
            ) : (
              resolvedPenalties.map((penalty) => {
                const player = playerMap.get(penalty.player_id);

                return (
                  <div
                    key={penalty.id}
                    className="rounded-2xl border border-black/10 bg-neutral-50 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-base font-semibold text-slate-950">
                          {player ? getPlayerDisplayName(player) : `Spieler ${penalty.player_id}`}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {penalty.reason || "Ohne Grund"} · {typeLabel(penalty.type)}
                          {penalty.value ? ` · ${penalty.value}` : ""}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Erledigt: {formatDate(penalty.resolved_at)}
                        </div>
                      </div>

                      <form action={reopenPenaltyAction}>
                        <input type="hidden" name="penalty_id" value={penalty.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                        >
                          Wieder öffnen
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </main>
  );
}