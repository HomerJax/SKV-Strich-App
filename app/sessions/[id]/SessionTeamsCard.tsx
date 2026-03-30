"use client";

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
  collapsed: boolean;
  attendanceDirty: boolean;
  onToggleCollapsed: () => void;
  onGenerateTeams: () => void;
  onShareLineup: () => void;
  onSetSide: (playerId: number, side: TeamSide | null) => void;
};

function TeamMetaBlock({
  title,
  meta,
  count,
}: {
  title: string;
  meta: TeamMeta;
  count: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs text-slate-600">{count} Spieler</div>
      <div className="mt-2 text-[11px] text-slate-500">
        TW {meta.gk} · Hinten {meta.def} · Vorne {meta.att}
      </div>
      <div className="mt-1 text-[11px] text-slate-500">
        AH {meta.ah} · Ü32 {meta.u32}
      </div>
    </div>
  );
}

function CompactTag({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function PlayerMetaInline({ player }: { player: Player }) {
  return (
    <div className="flex items-center gap-1.5">
      <CompactTag className={ageBadgeColor(player.age_group)}>
        {player.age_group ?? "?"}
      </CompactTag>
      <CompactTag className={badgeColor(player.preferred_position)}>
        {positionLabel(player.preferred_position)}
      </CompactTag>
    </div>
  );
}

function TeamPlayerRow({
  player,
  hasResult,
  currentSide,
  onSetSide,
}: {
  player: Player;
  hasResult: boolean;
  currentSide: TeamSide;
  onSetSide: (playerId: number, side: TeamSide | null) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">
            {getPlayerDisplayName(player)}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <PlayerMetaInline player={player} />

          {!hasResult ? (
            <>
              <button
                type="button"
                onClick={() => onSetSide(player.id, currentSide === "A" ? "B" : "A")}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Nach Team {currentSide === "A" ? "2" : "1"}
              </button>

              <button
                type="button"
                onClick={() => onSetSide(player.id, null)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Raus
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function UnassignedPlayerRow({
  player,
  hasResult,
  onSetSide,
}: {
  player: Player;
  hasResult: boolean;
  onSetSide: (playerId: number, side: TeamSide | null) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">
            {getPlayerDisplayName(player)}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <PlayerMetaInline player={player} />

          {!hasResult ? (
            <>
              <button
                type="button"
                onClick={() => onSetSide(player.id, "A")}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Zu Team 1
              </button>

              <button
                type="button"
                onClick={() => onSetSide(player.id, "B")}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Zu Team 2
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TeamColumn({
  title,
  players,
  meta,
  hasResult,
  side,
  onSetSide,
}: {
  title: string;
  players: Player[];
  meta: TeamMeta;
  hasResult: boolean;
  side: TeamSide;
  onSetSide: (playerId: number, side: TeamSide | null) => void;
}) {
  return (
    <div className="space-y-3">
      <TeamMetaBlock title={title} meta={meta} count={players.length} />

      {players.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
          Noch keine Spieler zugewiesen.
        </div>
      ) : (
        <div className="space-y-2.5">
          {players.map((player) => (
            <TeamPlayerRow
              key={`${side}-${player.id}`}
              player={player}
              hasResult={hasResult}
              currentSide={side}
              onSetSide={onSetSide}
            />
          ))}
        </div>
      )}
    </div>
  );
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
  collapsed,
  attendanceDirty,
  onToggleCollapsed,
  onGenerateTeams,
  onShareLineup,
  onSetSide,
}: SessionTeamsCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">Teams</div>
          <div className="mt-1 text-xs text-slate-500">
            {teamA.length} in Team 1 · {teamB.length} in Team 2
            {unassigned.length > 0 ? ` · ${unassigned.length} offen` : ""}
          </div>
          {hasResult ? (
            <div className="mt-1 text-[11px] text-slate-500">
              Gesperrt, weil bereits ein Ergebnis gespeichert ist.
            </div>
          ) : attendanceDirty ? (
            <div className="mt-1 text-[11px] text-amber-700">
              Bitte zuerst die Anwesenheit speichern.
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {!collapsed && !hasResult ? (
            <>
              <button
                type="button"
                onClick={onGenerateTeams}
                disabled={attendanceDirty || saving}
                className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Teams generieren
              </button>

              <button
                type="button"
                onClick={onShareLineup}
                disabled={!canShareLineup || sharingLineup}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sharingLineup ? "Teilt..." : "Aufstellung teilen"}
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={onToggleCollapsed}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {collapsed ? "Aufklappen" : "Einklappen"}
          </button>
        </div>
      </div>

      {!collapsed ? (
        <div className="space-y-4 p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <TeamColumn
              title="Team 1"
              players={teamA}
              meta={metaA}
              hasResult={hasResult}
              side="A"
              onSetSide={onSetSide}
            />

            <TeamColumn
              title="Team 2"
              players={teamB}
              meta={metaB}
              hasResult={hasResult}
              side="B"
              onSetSide={onSetSide}
            />
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-900">
              Noch nicht zugewiesen
            </div>

            {unassigned.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                {teamsComplete
                  ? "Alle anwesenden Spieler sind einem Team zugewiesen."
                  : "Aktuell keine offenen Spieler."}
              </div>
            ) : (
              <div className="space-y-2.5">
                {unassigned.map((player) => (
                  <UnassignedPlayerRow
                    key={`unassigned-${player.id}`}
                    player={player}
                    hasResult={hasResult}
                    onSetSide={onSetSide}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 text-xs text-slate-500">
          Team 1: {teamA.length} · Team 2: {teamB.length}
          {unassigned.length > 0 ? ` · Offen: ${unassigned.length}` : ""}
        </div>
      )}
    </section>
  );
}