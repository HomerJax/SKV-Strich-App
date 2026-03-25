import { getPlayerDisplayName } from "@/lib/player-display";
import type { Player, TeamSide } from "./session-types";
import { ageBadgeColor, badgeColor, positionLabel } from "./session-ui";

type TeamMeta = {
  gk: number;
  def: number;
  att: number;
  ah: number;
  u32: number;
};

type SessionTeamsCardProps = {
  teamA: Player[];
  teamB: Player[];
  unassigned: Player[];
  metaA: TeamMeta;
  metaB: TeamMeta;
  hasResult: boolean;
  saving: boolean;
  teamsComplete: boolean;
  canShareLineup: boolean;
  sharingLineup: boolean;
  onGenerateTeams: () => void;
  onShareLineup: () => void;
  onSetSide: (playerId: number, side: TeamSide | null) => void;
};

function guestBadge(player: Player) {
  return player.is_guest ? (
    <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] text-white">
      Gast
    </span>
  ) : null;
}

export default function SessionTeamsCard({
  teamA,
  teamB,
  unassigned,
  metaA,
  metaB,
  hasResult,
  saving,
  teamsComplete,
  canShareLineup,
  sharingLineup,
  onGenerateTeams,
  onShareLineup,
  onSetSide,
}: SessionTeamsCardProps) {
  return (
    <div className="space-y-3 rounded-xl border bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold">Teams</div>
          <div className="text-[11px] text-slate-500">
            {teamsComplete
              ? "Beide Teams sind vollständig zugewiesen."
              : "Es fehlen noch Zuweisungen oder ein Team ist leer."}
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
          <button
            onClick={onGenerateTeams}
            disabled={hasResult || saving}
            className={`rounded-xl px-3 py-2 text-xs font-semibold shadow-sm transition ${
              hasResult || saving
                ? "cursor-not-allowed border border-emerald-200 bg-emerald-100 text-emerald-900 opacity-60"
                : "border border-emerald-300 bg-emerald-200 text-emerald-950 hover:bg-emerald-300"
            }`}
          >
            Teams generieren
          </button>

          <button
            onClick={onShareLineup}
            disabled={sharingLineup || !canShareLineup}
            className={`rounded-xl border bg-white px-3 py-2 text-xs shadow-sm transition ${
              sharingLineup || !canShareLineup
                ? "cursor-not-allowed opacity-60"
                : "hover:bg-slate-50"
            }`}
          >
            {sharingLineup ? "Teile…" : "Aufstellung teilen"}
          </button>
        </div>
      </div>

      {hasResult && (
        <div className="text-[11px] text-slate-500">
          Teams sind gesperrt, weil ein Ergebnis gespeichert ist. Lösche das
          Ergebnis, um Teams zu ändern.
        </div>
      )}

      {!canShareLineup && (
        <div className="text-[11px] text-slate-500">
          Aufstellung teilen ist verfügbar, sobald beide Teams mindestens einen
          Spieler haben.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 rounded-lg border p-2">
          <div className="text-xs font-semibold">Team 1 ({teamA.length})</div>
          <div className="text-[11px] text-slate-500">
            GK {metaA.gk} · Hinten {metaA.def} · Vorne {metaA.att} · AH {metaA.ah} ·
            Ü32 {metaA.u32}
          </div>

          {teamA.length === 0 ? (
            <div className="text-[11px] text-slate-400">
              Noch kein Spieler zugewiesen.
            </div>
          ) : (
            <div className="space-y-1">
              {teamA.map((player) => (
                <button
                  key={player.id}
                  onClick={() => onSetSide(player.id, null)}
                  disabled={hasResult || saving}
                  className={`flex w-full items-center justify-between rounded-md border bg-white px-2 py-1 text-left text-xs hover:bg-slate-50 ${
                    hasResult || saving
                      ? "cursor-not-allowed opacity-60 hover:bg-white"
                      : ""
                  }`}
                  title={
                    hasResult
                      ? "Gesperrt: Ergebnis gespeichert"
                      : "Klick: aus Team entfernen"
                  }
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{getPlayerDisplayName(player)}</span>
                    {guestBadge(player)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] ${ageBadgeColor(
                        player.age_group
                      )}`}
                    >
                      {player.age_group ?? "?"}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] ${badgeColor(
                        player.preferred_position
                      )}`}
                    >
                      {positionLabel(player.preferred_position)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-lg border p-2">
          <div className="text-xs font-semibold">Team 2 ({teamB.length})</div>
          <div className="text-[11px] text-slate-500">
            GK {metaB.gk} · Hinten {metaB.def} · Vorne {metaB.att} · AH {metaB.ah} ·
            Ü32 {metaB.u32}
          </div>

          {teamB.length === 0 ? (
            <div className="text-[11px] text-slate-400">
              Noch kein Spieler zugewiesen.
            </div>
          ) : (
            <div className="space-y-1">
              {teamB.map((player) => (
                <button
                  key={player.id}
                  onClick={() => onSetSide(player.id, null)}
                  disabled={hasResult || saving}
                  className={`flex w-full items-center justify-between rounded-md border bg-white px-2 py-1 text-left text-xs hover:bg-slate-50 ${
                    hasResult || saving
                      ? "cursor-not-allowed opacity-60 hover:bg-white"
                      : ""
                  }`}
                  title={
                    hasResult
                      ? "Gesperrt: Ergebnis gespeichert"
                      : "Klick: aus Team entfernen"
                  }
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{getPlayerDisplayName(player)}</span>
                    {guestBadge(player)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] ${ageBadgeColor(
                        player.age_group
                      )}`}
                    >
                      {player.age_group ?? "?"}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] ${badgeColor(
                        player.preferred_position
                      )}`}
                    >
                      {positionLabel(player.preferred_position)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border p-2">
        <div className="mb-2 text-xs font-semibold">
          Nicht zugewiesen ({unassigned.length})
        </div>

        {unassigned.length === 0 ? (
          <div className="text-[11px] text-slate-400">
            Alle Spieler sind einem Team zugeordnet.
          </div>
        ) : (
          <div className="space-y-1">
            {unassigned.map((player) => (
              <div
                key={player.id}
                className="flex w-full items-center justify-between gap-2 rounded-md border bg-white px-2 py-1 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="truncate font-medium">
                      {getPlayerDisplayName(player)}
                    </div>
                    {guestBadge(player)}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <span
                      className={`rounded-md px-2 py-0.5 ${ageBadgeColor(
                        player.age_group
                      )}`}
                    >
                      {player.age_group ?? "?"}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 ${badgeColor(
                        player.preferred_position
                      )}`}
                    >
                      {positionLabel(player.preferred_position)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    disabled={hasResult || saving}
                    className={`rounded-md border px-2 py-1 text-[11px] hover:bg-slate-50 ${
                      hasResult || saving
                        ? "cursor-not-allowed opacity-60 hover:bg-white"
                        : ""
                    }`}
                    onClick={() => onSetSide(player.id, "A")}
                  >
                    → Team 1
                  </button>
                  <button
                    disabled={hasResult || saving}
                    className={`rounded-md border px-2 py-1 text-[11px] hover:bg-slate-50 ${
                      hasResult || saving
                        ? "cursor-not-allowed opacity-60 hover:bg-white"
                        : ""
                    }`}
                    onClick={() => onSetSide(player.id, "B")}
                  >
                    → Team 2
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-[11px] text-slate-500">
        Hinweis: Anzeige ist nach Torwart / Hinten / Vorne sortiert (danach
        alphabetisch).
      </div>
    </div>
  );
}