import type { Player, TeamSide } from "./session-types";
import { getPlayerDisplayName } from "@/lib/player-display";

type TeamMeta = {
  gk: number;
  def: number;
  att: number;
  ah: number;
  u32: number;
};

type Props = {
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

function MetaBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
      {label}: {value}
    </div>
  );
}

function TeamPlayerRow({
  player,
  hasResult,
  onSetSide,
}: {
  player: Player;
  hasResult: boolean;
  onSetSide: (playerId: number, side: TeamSide | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-900">
          {getPlayerDisplayName(player)}
        </div>

        <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-slate-500">
          {player.preferred_position ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5">
              {player.preferred_position}
            </span>
          ) : null}

          {player.age_group ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5">
              {player.age_group}
            </span>
          ) : null}

          {typeof player.strength === "number" ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5">
              Stärke {player.strength}
            </span>
          ) : null}
        </div>
      </div>

      {!hasResult ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onSetSide(player.id, "A")}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            A
          </button>

          <button
            type="button"
            onClick={() => onSetSide(player.id, null)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            –
          </button>

          <button
            type="button"
            onClick={() => onSetSide(player.id, "B")}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            B
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TeamColumn({
  title,
  players,
  meta,
  side,
  hasResult,
  onSetSide,
}: {
  title: string;
  players: Player[];
  meta: TeamMeta;
  side: TeamSide;
  hasResult: boolean;
  onSetSide: (playerId: number, side: TeamSide | null) => void;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-950">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {players.length} Spieler
          </p>
        </div>

        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
          {players.length}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <MetaBadge label="TW" value={meta.gk} />
        <MetaBadge label="DEF" value={meta.def} />
        <MetaBadge label="ANG" value={meta.att} />
        <MetaBadge label="AH" value={meta.ah} />
        <MetaBadge label="Ü32" value={meta.u32} />
      </div>

      <div className="mt-4 space-y-2">
        {players.length > 0 ? (
          players.map((player) => (
            <TeamPlayerRow
              key={`${side}-${player.id}`}
              player={player}
              hasResult={hasResult}
              onSetSide={onSetSide}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
            Noch keine Spieler in {title}.
          </div>
        )}
      </div>
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
  onGenerateTeams,
  onShareLineup,
  onSetSide,
}: Props) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-500">Teams</div>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">
            Teams aufteilen
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Weise alle anwesenden Spieler Team A oder Team B zu. Erst wenn
            niemand mehr offen ist, kann das Ergebnis sauber gespeichert werden.
          </p>
        </div>

        {!hasResult ? (
          <button
            type="button"
            onClick={onGenerateTeams}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Teams generieren
          </button>
        ) : (
          <div className="inline-flex h-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700">
            Teams gesperrt
          </div>
        )}
      </div>

      {unassigned.length > 0 ? (
        <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-amber-900">
                Noch nicht zugewiesen
              </div>
              <p className="mt-1 text-xs text-amber-800">
                Diese Spieler müssen noch einem Team zugeordnet werden.
              </p>
            </div>

            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm">
              {unassigned.length}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {unassigned.map((player) => (
              <TeamPlayerRow
                key={`unassigned-${player.id}`}
                player={player}
                hasResult={hasResult}
                onSetSide={onSetSide}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <TeamColumn
          title="Team A"
          players={teamA}
          meta={metaA}
          side="A"
          hasResult={hasResult}
          onSetSide={onSetSide}
        />

        <TeamColumn
          title="Team B"
          players={teamB}
          meta={metaB}
          side="B"
          hasResult={hasResult}
          onSetSide={onSetSide}
        />
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            {teamsComplete
              ? "Alle Spieler sind Teams zugeordnet."
              : "Ordne zuerst alle anwesenden Spieler einem Team zu."}
          </div>

          <button
            type="button"
            onClick={onShareLineup}
            disabled={!canShareLineup || sharingLineup}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sharingLineup ? "Teilt ..." : "Aufstellung teilen"}
          </button>
        </div>
      </div>
    </section>
  );
}