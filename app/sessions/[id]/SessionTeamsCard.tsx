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
    <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
      {label}: {value}
    </div>
  );
}

function PlayerRow({
  player,
  hasResult,
  onSetSide,
}: {
  player: Player;
  hasResult: boolean;
  onSetSide: (playerId: number, side: TeamSide | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-900">
          {getPlayerDisplayName(player)}
        </div>
      </div>

      {!hasResult && (
        <div className="flex gap-1">
          <button
            onClick={() => onSetSide(player.id, "A")}
            className="px-2 py-1 text-xs border rounded"
          >
            A
          </button>
          <button
            onClick={() => onSetSide(player.id, null)}
            className="px-2 py-1 text-xs border rounded"
          >
            –
          </button>
          <button
            onClick={() => onSetSide(player.id, "B")}
            className="px-2 py-1 text-xs border rounded"
          >
            B
          </button>
        </div>
      )}
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
  const isA = side === "A";

  return (
    <div
      className={`rounded-[24px] border p-4 ${
        isA
          ? "bg-blue-50 border-blue-200"
          : "bg-emerald-50 border-emerald-200"
      }`}
    >
      <div className="flex justify-between">
        <h3 className="font-bold">{title}</h3>
        <div
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isA
              ? "bg-blue-100 text-blue-800"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {players.length}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        <MetaBadge label="TW" value={meta.gk} />
        <MetaBadge label="DEF" value={meta.def} />
        <MetaBadge label="ANG" value={meta.att} />
      </div>

      <div className="mt-3 space-y-2">
        {players.map((p) => (
          <PlayerRow
            key={p.id}
            player={p}
            hasResult={hasResult}
            onSetSide={onSetSide}
          />
        ))}
      </div>
    </div>
  );
}

export default function SessionTeamsCard(props: Props) {
  const {
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
  } = props;

  return (
    <section className="rounded-2xl border bg-white p-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bold">Teams</h2>

        {!hasResult && (
          <button
            onClick={onGenerateTeams}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Teams generieren
          </button>
        )}
      </div>

      {unassigned.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 border rounded">
          <div className="text-sm font-semibold">
            Nicht zugewiesen ({unassigned.length})
          </div>

          <div className="mt-2 space-y-2">
            {unassigned.map((p) => (
              <PlayerRow
                key={p.id}
                player={p}
                hasResult={hasResult}
                onSetSide={onSetSide}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mt-4">
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

      {/* SHARE UNTEN */}
      <div className="mt-4 border-t pt-4 flex justify-between items-center">
        <div className="text-xs text-slate-500">
          {teamsComplete
            ? "Teams vollständig"
            : "Alle Spieler zuweisen"}
        </div>

        <button
          onClick={onShareLineup}
          disabled={!canShareLineup || sharingLineup}
          className="border px-3 py-2 rounded text-sm"
        >
          {sharingLineup ? "Teilt..." : "Aufstellung teilen"}
        </button>
      </div>
    </section>
  );
}