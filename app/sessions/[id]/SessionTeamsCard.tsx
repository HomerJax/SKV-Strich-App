"use client";

import { useState } from "react";
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
  teamsConfirmed: boolean;
  canShareLineup: boolean;
  sharingLineup: boolean;
  collapsed: boolean;
  attendanceDirty: boolean;
  enableFieldView?: boolean;
  onToggleCollapsed: () => void;
  onGenerateTeams: () => void;
  onConfirmTeams: () => void;
  onShareLineup: () => void;
  onSetSide: (playerId: number, side: TeamSide | null) => void;
};

type SlotRow = "gk" | "def" | "mid" | "att";
type ViewMode = "list" | "field";
type TeamLayoutMode = "compare" | "stacked";

type PositionedPlayer = {
  player: Player;
  row: SlotRow;
  slotIndex: number;
};

function getDisplayName(player: Player) {
  return player.name?.trim() || getPlayerDisplayName(player);
}

function SummaryPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "muted" | "warning";
}) {
  const className =
    tone === "success"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "warning"
        ? "bg-amber-100 text-amber-800"
        : tone === "muted"
          ? "bg-slate-100 text-slate-600"
          : "bg-white text-slate-700 ring-1 ring-slate-200";

  return (
    <div
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}
    >
      {children}
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
      className={`inline-flex items-center rounded-full px-1.5 py-px text-[6px] font-semibold leading-none ${className}`}
    >
      {children}
    </span>
  );
}

function ControlButton({
  children,
  onClick,
  disabled = false,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "primary" | "success";
}) {
  const className =
    tone === "primary"
      ? "bg-slate-950 text-white hover:bg-slate-800"
      : tone === "success"
        ? "bg-emerald-600 text-white hover:bg-emerald-700"
        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold transition ${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

function MiniActionButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[9px] font-semibold leading-none text-slate-700 transition hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function TeamMetaLine({ meta }: { meta: TeamMeta }) {
  return (
    <div className="text-[9px] leading-tight text-slate-500">
      TW {meta.gk} · DE {meta.def} · AT {meta.att} · AH {meta.ah}
      <br />
      Ü32 {meta.u32}
    </div>
  );
}

function PlayerInlineMeta({ player }: { player: Player }) {
  return (
    <span className="flex items-center gap-1 shrink-0">
      <CompactTag className={ageBadgeColor(player.age_group)}>
        {player.age_group ?? "?"}
      </CompactTag>
      <CompactTag className={badgeColor(player.preferred_position)}>
        {positionLabel(player.preferred_position)}
      </CompactTag>
    </span>
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
    <div className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
      <div className="flex items-center justify-between gap-1.5">
        <div className="min-w-0 flex flex-1 flex-col">
          <div
            className="truncate text-[9px] font-semibold leading-tight text-slate-900"
            title={getDisplayName(player)}
          >
            {getDisplayName(player)}
          </div>

          <div className="mt-1 flex items-center justify-between gap-1.5">
            <PlayerInlineMeta player={player} />

            {!hasResult ? (
              <div className="flex shrink-0 items-center gap-1">
                <MiniActionButton onClick={() => onSetSide(player.id, null)}>
                  ×
                </MiniActionButton>
              </div>
            ) : null}
          </div>
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
    <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
      <div className="flex items-center justify-between gap-1.5">
        <div className="min-w-0 flex flex-1 flex-col">
          <div
            className="truncate text-[9px] font-semibold leading-tight text-slate-900"
            title={getDisplayName(player)}
          >
            {getDisplayName(player)}
          </div>

          <div className="mt-1 flex items-center justify-between gap-1.5">
            <PlayerInlineMeta player={player} />

            {!hasResult ? (
              <div className="flex shrink-0 items-center gap-1">
                <MiniActionButton onClick={() => onSetSide(player.id, "A")}>
                  →1
                </MiniActionButton>
                <MiniActionButton onClick={() => onSetSide(player.id, "B")}>
                  →2
                </MiniActionButton>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function sortForList(players: Player[]) {
  return [...players].sort((a, b) => {
    const rank = (player: Player) => {
      if (player.preferred_position === "goalkeeper") return 0;
      if (player.preferred_position === "defense") return 1;
      if (player.preferred_position === "attack") return 2;
      return 3;
    };

    return rank(a) - rank(b);
  });
}

function preferKeeperFromDefense(players: Player[]) {
  const explicitKeeper = players.find(
    (player) => player.preferred_position === "goalkeeper"
  );
  if (explicitKeeper) return explicitKeeper;

  const defender = players.find((player) => player.preferred_position === "defense");
  if (defender) return defender;

  return players[0] ?? null;
}

function takePlayers(
  source: Player[],
  predicate: (player: Player) => boolean,
  count: number
) {
  const picked: Player[] = [];
  const rest: Player[] = [];

  for (const player of source) {
    if (picked.length < count && predicate(player)) {
      picked.push(player);
    } else {
      rest.push(player);
    }
  }

  return { picked, rest };
}

function buildFormationBuckets(players: Player[]) {
  if (players.length === 0) {
    return {
      gk: [] as Player[],
      def: [] as Player[],
      mid: [] as Player[],
      att: [] as Player[],
    };
  }

  const ordered = sortForList(players);
  const keeper = preferKeeperFromDefense(ordered);

  const withoutKeeper = keeper
    ? ordered.filter((player) => player.id !== keeper.id)
    : ordered;

  const targetDef = Math.min(4, withoutKeeper.length);
  const remainingAfterDefTarget = Math.max(0, withoutKeeper.length - targetDef);

  const targetMid = Math.min(4, remainingAfterDefTarget);
  const remainingAfterMidTarget = Math.max(
    0,
    withoutKeeper.length - targetDef - targetMid
  );
  const targetAtt = Math.min(2, remainingAfterMidTarget);

  let pool = [...withoutKeeper];

  const defPreferred = takePlayers(
    pool,
    (player) => player.preferred_position === "defense",
    targetDef
  );
  const def = [...defPreferred.picked];
  pool = defPreferred.rest;

  if (def.length < targetDef) {
    const fillDef = takePlayers(pool, () => true, targetDef - def.length);
    def.push(...fillDef.picked);
    pool = fillDef.rest;
  }

  const midPreferred = takePlayers(
    pool,
    (player) => player.preferred_position !== "attack",
    targetMid
  );
  const mid = [...midPreferred.picked];
  pool = midPreferred.rest;

  if (mid.length < targetMid) {
    const fillMid = takePlayers(pool, () => true, targetMid - mid.length);
    mid.push(...fillMid.picked);
    pool = fillMid.rest;
  }

  const attPreferred = takePlayers(
    pool,
    (player) => player.preferred_position === "attack",
    targetAtt
  );
  const att = [...attPreferred.picked];
  pool = attPreferred.rest;

  if (att.length < targetAtt) {
    const fillAtt = takePlayers(pool, () => true, targetAtt - att.length);
    att.push(...fillAtt.picked);
    pool = fillAtt.rest;
  }

  const extraDef = takePlayers(
    pool,
    () => true,
    Math.min(4 - def.length, pool.length)
  );
  def.push(...extraDef.picked);
  pool = extraDef.rest;

  const extraMid = takePlayers(
    pool,
    () => true,
    Math.min(4 - mid.length, pool.length)
  );
  mid.push(...extraMid.picked);
  pool = extraMid.rest;

  const extraAtt = takePlayers(
    pool,
    () => true,
    Math.min(2 - att.length, pool.length)
  );
  att.push(...extraAtt.picked);

  return {
    gk: keeper ? [keeper] : [],
    def,
    mid,
    att,
  };
}

function placePlayersOnFormation(players: Player[]): PositionedPlayer[] {
  const buckets = buildFormationBuckets(players);

  return [
    ...buckets.gk.map((player, index) => ({
      player,
      row: "gk" as const,
      slotIndex: index,
    })),
    ...buckets.def.map((player, index) => ({
      player,
      row: "def" as const,
      slotIndex: index,
    })),
    ...buckets.mid.map((player, index) => ({
      player,
      row: "mid" as const,
      slotIndex: index,
    })),
    ...buckets.att.map((player, index) => ({
      player,
      row: "att" as const,
      slotIndex: index,
    })),
  ];
}

function getHorizontalPercent(row: SlotRow, slotIndex: number, count: number) {
  if (row === "gk") return 50;

  if (count <= 1) return 50;
  if (count === 2) return [42, 58][slotIndex] ?? 50;
  if (count === 3) return [34, 50, 66][slotIndex] ?? 50;
  if (count === 4) return [23, 41, 59, 77][slotIndex] ?? 50;

  return [18, 34, 50, 66, 82][slotIndex] ?? 50;
}

function getVerticalPercent(row: SlotRow, team: "A" | "B") {
  if (team === "A") {
    if (row === "gk") return 11;
    if (row === "def") return 24;
    if (row === "mid") return 37;
    return 46;
  }

  if (row === "gk") return 89;
  if (row === "def") return 76;
  if (row === "mid") return 63;
  return 54;
}

function FieldPlayerChip({
  player,
  top,
  left,
  hasResult,
  onRemove,
}: {
  player: Player;
  top: number;
  left: number;
  hasResult: boolean;
  onRemove: () => void;
}) {
  return (
    <div
      className="absolute w-[54px] -translate-x-1/2 -translate-y-1/2"
      style={{ top: `${top}%`, left: `${left}%` }}
    >
      <div className="rounded-lg border border-white/70 bg-white/92 px-1 py-1 text-center shadow-sm backdrop-blur-sm">
        <div
          className="truncate text-[7px] font-bold leading-tight text-slate-900"
          title={getDisplayName(player)}
        >
          {getDisplayName(player)}
        </div>

        <div className="mt-0.5 flex items-center justify-center gap-1">
          <CompactTag className={badgeColor(player.preferred_position)}>
            {positionLabel(player.preferred_position).slice(0, 2)}
          </CompactTag>
          <CompactTag className={ageBadgeColor(player.age_group)}>
            {player.age_group ?? "?"}
          </CompactTag>

          {!hasResult ? (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-300 bg-white text-[8px] font-bold text-slate-700 transition hover:bg-slate-50"
              aria-label={`${getDisplayName(player)} aus Team entfernen`}
            >
              ×
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CombinedTeamField({
  teamA,
  teamB,
  hasResult,
  onSetSide,
}: {
  teamA: Player[];
  teamB: Player[];
  hasResult: boolean;
  onSetSide: (playerId: number, side: TeamSide | null) => void;
}) {
  const positionedA = placePlayersOnFormation(teamA);
  const positionedB = placePlayersOnFormation(teamB);

  const countByRowA = positionedA.reduce<Record<SlotRow, number>>(
    (acc, item) => {
      acc[item.row] += 1;
      return acc;
    },
    { gk: 0, def: 0, mid: 0, att: 0 }
  );

  const countByRowB = positionedB.reduce<Record<SlotRow, number>>(
    (acc, item) => {
      acc[item.row] += 1;
      return acc;
    },
    { gk: 0, def: 0, mid: 0, att: 0 }
  );

  return (
    <div className="rounded-3xl border border-slate-200 bg-[rgba(15,23,42,0.02)] p-2 shadow-sm">
      <div className="relative h-[560px] overflow-hidden rounded-[28px] border border-emerald-200/70 bg-[linear-gradient(180deg,rgba(134,239,172,0.18)_0%,rgba(74,222,128,0.14)_50%,rgba(134,239,172,0.18)_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:36px_36px]" />

        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/65" />
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/65" />
        <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/65" />
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />

        <div className="absolute left-1/2 top-0 h-[16%] w-[42%] -translate-x-1/2 border-x border-b border-white/65" />
        <div className="absolute left-1/2 top-0 h-[7%] w-[18%] -translate-x-1/2 border-x border-b border-white/65" />
        <div className="absolute left-1/2 bottom-0 h-[16%] w-[42%] -translate-x-1/2 border-x border-t border-white/65" />
        <div className="absolute left-1/2 bottom-0 h-[7%] w-[18%] -translate-x-1/2 border-x border-t border-white/65" />

        {positionedA.map(({ player, row, slotIndex }) => (
          <FieldPlayerChip
            key={`field-a-${player.id}`}
            player={player}
            top={getVerticalPercent(row, "A")}
            left={getHorizontalPercent(row, slotIndex, countByRowA[row])}
            hasResult={hasResult}
            onRemove={() => onSetSide(player.id, null)}
          />
        ))}

        {positionedB.map(({ player, row, slotIndex }) => (
          <FieldPlayerChip
            key={`field-b-${player.id}`}
            player={player}
            top={getVerticalPercent(row, "B")}
            left={getHorizontalPercent(row, slotIndex, countByRowB[row])}
            hasResult={hasResult}
            onRemove={() => onSetSide(player.id, null)}
          />
        ))}
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
  const sortedPlayers = sortForList(players);

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/80 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-slate-950">{title}</div>
        <div className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200">
          {players.length}
        </div>
      </div>

      <div className="mt-1">
        <TeamMetaLine meta={meta} />
      </div>

      {sortedPlayers.length === 0 ? (
        <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-white px-2 py-2 text-[11px] text-slate-500">
          Keine Spieler
        </div>
      ) : (
        <div className="mt-2 space-y-1">
          {sortedPlayers.map((player) => (
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

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
      <button
        type="button"
        onClick={() => onChange("list")}
        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
          value === "list"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Liste
      </button>
      <button
        type="button"
        onClick={() => onChange("field")}
        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
          value === "field"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Spielfeld
      </button>
    </div>
  );
}

function TeamLayoutToggle({
  value,
  onChange,
}: {
  value: TeamLayoutMode;
  onChange: (next: TeamLayoutMode) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
      <button
        type="button"
        onClick={() => onChange("compare")}
        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
          value === "compare"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Vergleich
      </button>
      <button
        type="button"
        onClick={() => onChange("stacked")}
        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
          value === "stacked"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Untereinander
      </button>
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
  teamsConfirmed,
  canShareLineup,
  sharingLineup,
  collapsed,
  attendanceDirty,
  enableFieldView = false,
  onToggleCollapsed,
  onGenerateTeams,
  onConfirmTeams,
  onShareLineup,
  onSetSide,
}: SessionTeamsCardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [layoutMode, setLayoutMode] = useState<TeamLayoutMode>("compare");

  const effectiveViewMode: ViewMode =
    enableFieldView && viewMode === "field" ? "field" : "list";

  const done = teamsComplete && teamsConfirmed;
  const assignedCount = teamA.length + teamB.length;
  const openCount = unassigned.length;

  if (collapsed) {
    return (
      <section className="rounded-[20px] border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={`flex w-full items-center justify-between gap-4 rounded-[20px] px-4 py-3.5 text-left transition ${
            done ? "bg-emerald-50" : "hover:bg-slate-50/70"
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            {done ? (
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white"
              >
                ✓
              </span>
            ) : (
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500"
              >
                2
              </span>
            )}

            <div className="min-w-0">
              <div
                className={`text-sm font-bold sm:text-base ${
                  done ? "text-emerald-950" : "text-slate-950"
                }`}
              >
                {done ? "Teams erledigt" : "Teams"}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <SummaryPill tone={done ? "success" : "default"}>
                  {assignedCount} verteilt
                </SummaryPill>

                {!done && teamsComplete ? (
                  <SummaryPill tone="warning">Bestätigung offen</SummaryPill>
                ) : null}

                {openCount > 0 ? (
                  <SummaryPill tone="muted">{openCount} offen</SummaryPill>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            Aufklappen
          </div>
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-[20px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                2
              </div>

              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">Teams</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {teamsComplete ? (
                    teamsConfirmed ? (
                      <SummaryPill tone="success">Bestätigt</SummaryPill>
                    ) : (
                      <SummaryPill tone="warning">Bitte prüfen</SummaryPill>
                    )
                  ) : (
                    <SummaryPill tone="muted">Noch unvollständig</SummaryPill>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleCollapsed}
            className="shrink-0 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Einklappen
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!hasResult ? (
            <>
              <ControlButton
                onClick={onGenerateTeams}
                disabled={attendanceDirty || saving}
                tone="primary"
              >
                Teams generieren
              </ControlButton>

              <ControlButton
                onClick={onConfirmTeams}
                disabled={!teamsComplete || teamsConfirmed || saving}
                tone="success"
              >
                {teamsConfirmed ? "Teams bestätigt" : "Teams bestätigen"}
              </ControlButton>

              <ControlButton
                onClick={onShareLineup}
                disabled={!canShareLineup || sharingLineup}
              >
                {sharingLineup ? "Teilt..." : "Aufstellung teilen"}
              </ControlButton>
            </>
          ) : null}

          <TeamLayoutToggle value={layoutMode} onChange={setLayoutMode} />

          {enableFieldView ? (
            <ViewToggle value={effectiveViewMode} onChange={setViewMode} />
          ) : null}
        </div>
      </div>

      <div className="space-y-4 p-4">
        {enableFieldView && effectiveViewMode === "field" ? (
          <CombinedTeamField
            teamA={teamA}
            teamB={teamB}
            hasResult={hasResult}
            onSetSide={onSetSide}
          />
        ) : (
          <div
            className={
              layoutMode === "compare"
                ? "grid grid-cols-2 gap-2"
                : "grid grid-cols-1 gap-2"
            }
          >
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
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">
              Noch nicht zugewiesen
            </div>
            <SummaryPill tone={openCount > 0 ? "muted" : "success"}>
              {openCount}
            </SummaryPill>
          </div>

          {unassigned.length === 0 ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-500">
              {teamsComplete
                ? "Alle anwesenden Spieler sind einem Team zugewiesen."
                : "Aktuell keine offenen Spieler."}
            </div>
          ) : (
            <div className="mt-3 grid gap-1.5">
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
    </section>
  );
}