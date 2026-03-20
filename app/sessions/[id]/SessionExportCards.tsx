import { getPlayerDisplayName } from "@/lib/player-display";
import type { Player, SessionRow } from "./session-types";
import {
  ageBadgeColor,
  badgeColor,
  formatGermanDate,
  positionLabel,
  winnerBadgeClass,
  winnerLabel,
} from "./session-ui";

type TeamMeta = {
  gk: number;
  def: number;
  att: number;
  ah: number;
  u32: number;
};

type LineupExportCardProps = {
  session: SessionRow | null;
  teamA: Player[];
  teamB: Player[];
  metaA: TeamMeta;
  metaB: TeamMeta;
};

type ResultExportCardProps = {
  session: SessionRow | null;
  teamA: Player[];
  teamB: Player[];
  goalsA: string;
  goalsB: string;
  winnerPhotoUrl: string | null;
};

function sessionLabel(session: SessionRow | null) {
  return session ? formatGermanDate(session.date) : "Training";
}

function PlayerLineupRow({ player }: { player: Player }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-2.5 py-2">
      <span className="min-w-0 truncate text-xs font-medium text-slate-900">
        {getPlayerDisplayName(player)}
      </span>

      <span className="flex items-center gap-1 shrink-0">
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
    </div>
  );
}

function PlayerResultRow({ player }: { player: Player }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-2.5 py-2">
      <span className="min-w-0 truncate text-xs font-medium text-slate-900">
        {getPlayerDisplayName(player)}
      </span>

      <span
        className={`rounded-md px-2 py-0.5 text-[10px] ${badgeColor(
          player.preferred_position
        )}`}
      >
        {positionLabel(player.preferred_position)}
      </span>
    </div>
  );
}

function TeamMetaCard({
  title,
  count,
  meta,
}: {
  title: string;
  count: number;
  meta: TeamMeta;
}) {
  return (
    <div className="text-center">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-300">
        {title}
      </div>
      <div className="mt-2 text-4xl font-semibold leading-none">{count}</div>
      <div className="mt-2 text-[11px] text-slate-300">
        GK {meta.gk} · Hinten {meta.def} · Vorne {meta.att}
      </div>
      <div className="mt-1 text-[10px] text-slate-400">
        AH {meta.ah} · Ü32 {meta.u32}
      </div>
    </div>
  );
}

function TeamListCard({
  title,
  players,
  variant,
}: {
  title: string;
  players: Player[];
  variant: "lineup" | "result";
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-[10px] text-slate-500">
          {players.length} Spieler
        </div>
      </div>

      {players.length === 0 ? (
        <div className="mt-3 text-xs text-slate-400">
          Noch keine Spieler zugewiesen.
        </div>
      ) : (
        <div className="mt-3 space-y-1.5">
          {players.map((player) =>
            variant === "lineup" ? (
              <PlayerLineupRow
                key={`${title}-${player.id}`}
                player={player}
              />
            ) : (
              <PlayerResultRow
                key={`${title}-${player.id}`}
                player={player}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

export function LineupExportCard({
  session,
  teamA,
  teamB,
  metaA,
  metaB,
}: LineupExportCardProps) {
  return (
    <div
      id="export-lineup-card"
      className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm"
    >
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 py-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
              strikr
            </div>
            <div className="mt-2 text-2xl font-semibold leading-tight">
              Aufstellung
            </div>
            <div className="mt-1 text-sm text-slate-300">
              {sessionLabel(session)}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              made with strikr
            </div>
            <div className="mt-1 text-[10px] text-slate-300">#strikr</div>
          </div>
        </div>

        {session?.notes && (
          <div className="mt-4 rounded-[18px] border border-white/10 bg-white/10 px-3 py-2 text-[11px] text-slate-200">
            {session.notes}
          </div>
        )}

        <div className="mt-5 rounded-[24px] border border-white/10 bg-white/10 px-4 py-5 backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-4">
            <TeamMetaCard title="Team 1" count={teamA.length} meta={metaA} />
            <TeamMetaCard title="Team 2" count={teamB.length} meta={metaB} />
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-4">
        <div className="grid grid-cols-2 gap-3">
          <TeamListCard title="Team 1" players={teamA} variant="lineup" />
          <TeamListCard title="Team 2" players={teamB} variant="lineup" />
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="text-[10px] text-slate-500">
            {sessionLabel(session)}
          </div>

          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              made with strikr
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400">#strikr</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResultExportCard({
  session,
  teamA,
  teamB,
  goalsA,
  goalsB,
  winnerPhotoUrl,
}: ResultExportCardProps) {
  return (
    <div
      id="export-result-card"
      className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm"
    >
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 py-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
              strikr
            </div>
            <div className="mt-2 text-2xl font-semibold leading-tight">
              Ergebnis
            </div>
            <div className="mt-1 text-sm text-slate-300">
              {sessionLabel(session)}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              made with strikr
            </div>
            <div className="mt-1 text-[10px] text-slate-300">#strikr</div>
          </div>
        </div>

        {session?.notes && (
          <div className="mt-4 rounded-[18px] border border-white/10 bg-white/10 px-3 py-2 text-[11px] text-slate-200">
            {session.notes}
          </div>
        )}
      </div>

      <div className="bg-slate-50 p-4">
        {winnerPhotoUrl && (
          <div className="mb-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
            <img
              src={winnerPhotoUrl}
              alt="Siegerfoto"
              className="h-auto max-h-[380px] w-full object-cover"
            />
          </div>
        )}

        <div className="rounded-[24px] bg-slate-900 px-4 py-5 text-white">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="text-center">
              <div className="text-[11px] uppercase tracking-wide text-slate-300">
                Team 1
              </div>
              <div className="mt-2 text-5xl font-semibold leading-none">
                {goalsA.trim() === "" ? "?" : goalsA}
              </div>
              <div className="mt-2 text-[11px] text-slate-300">
                {teamA.length} Spieler
              </div>
            </div>

            <div className="text-3xl font-semibold text-slate-500">:</div>

            <div className="text-center">
              <div className="text-[11px] uppercase tracking-wide text-slate-300">
                Team 2
              </div>
              <div className="mt-2 text-5xl font-semibold leading-none">
                {goalsB.trim() === "" ? "?" : goalsB}
              </div>
              <div className="mt-2 text-[11px] text-slate-300">
                {teamB.length} Spieler
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-center">
            <div
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${winnerBadgeClass(
                goalsA,
                goalsB
              )}`}
            >
              {winnerLabel(goalsA, goalsB)}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <TeamListCard title="Team 1" players={teamA} variant="result" />
          <TeamListCard title="Team 2" players={teamB} variant="result" />
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="text-[10px] text-slate-500">
            {sessionLabel(session)}
          </div>

          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              made with strikr
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400">#strikr</div>
          </div>
        </div>
      </div>
    </div>
  );
}