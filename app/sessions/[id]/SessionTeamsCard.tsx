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
  collapsed: boolean;
  attendanceDirty: boolean;
  onToggleCollapsed: () => void;
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
  tone,
  onSetSide,
}: {
  player: Player;
  hasResult: boolean;
  tone: "neutral" | "blue" | "green";
  onSetSide: (playerId: number, side: TeamSide | null) => void;
}) {
  const toneClass =
    tone === "blue"
      ? "border-blue-200 bg-blue-50/60"
      : tone === "green"
        ? "border-emerald-200 bg-emerald-50/60"
        : "border-slate-200 bg-white";

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 ${toneClass}`}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-900">
          {getPlayerDisplayName(player)}
        </div>
      </div>

      {!hasResult ? (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onSetSide(player.id, "A")}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            A
          </button>
          <button
            type="button"
            onClick={() => onSetSide(player.id, null)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            –
          </button>
          <button
            type="button"
            onClick={() => onSetSide(player.id, "B")}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
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
  const isA = side === "A";

  return (
    <div
      className={`rounded-[24px] border p-4 ${
        isA
          ? "border-blue-200 bg-blue-50"
          : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          className={`text-base font-bold ${
            isA ? "text-blue-900" : "text-emerald-900"
          }`}
        >
          {title}
        </h3>

        <div
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isA
              ? "bg-blue-100 text-blue-800"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {players.length}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
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
            tone={isA ? "blue" : "green"}
            onSetSide={onSetSide}
          />
        ))}
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
  collapsed,
  attendanceDirty,
  onToggleCollapsed,
  onGenerateTeams,
  onShareLineup,
  onSetSide,
}: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">Teams</h2>
          <div className="mt-1 text-xs text-slate-500">
            {teamsComplete
              ? "Teams vollständig zugewiesen."
              : "Bitte alle anwesenden Spieler zuweisen."}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!collapsed && !hasResult ? (
            <button
              type="button"
              onClick={onGenerateTeams}
              disabled={attendanceDirty || saving}
              className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Teams generieren
            </button>
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
          {attendanceDirty ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Bitte zuerst die Anwesenheit speichern, bevor du Teams generierst oder
              manuell zuweist.
            </div>
          ) : null}

          {unassigned.length > 0 ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-amber-900">
                  Nicht zugewiesen
                </div>
                <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  {unassigned.length}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {unassigned.map((p) => (
                  <PlayerRow
                    key={p.id}
                    player={p}
                    hasResult={hasResult || attendanceDirty}
                    tone="neutral"
                    onSetSide={onSetSide}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <TeamColumn
              title="Team A"
              players={teamA}
              meta={metaA}
              side="A"
              hasResult={hasResult || attendanceDirty}
              onSetSide={onSetSide}
            />

            <TeamColumn
              title="Team B"
              players={teamB}
              meta={metaB}
              side="B"
              hasResult={hasResult || attendanceDirty}
              onSetSide={onSetSide}
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="text-xs text-slate-500">
              {teamsComplete
                ? "Teams vollständig"
                : "Alle Spieler müssen Team A oder B zugewiesen sein"}
            </div>

            <button
              type="button"
              onClick={onShareLineup}
              disabled={!canShareLineup || sharingLineup}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sharingLineup ? "Teilt..." : "Aufstellung teilen"}
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 text-xs text-slate-500">
          Team A: {teamA.length} · Team B: {teamB.length} · Offen: {unassigned.length}
        </div>
      )}
    </section>
  );
}