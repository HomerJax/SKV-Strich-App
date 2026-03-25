import { getPlayerDisplayName } from "@/lib/player-display";
import type { Player } from "./session-types";
import { ageBadgeColor, badgeColor, positionLabel } from "./session-ui";

type ClubSettings = {
  use_strength: boolean;
  strength_default: number;
  use_categories: boolean;
  category_label: string | null;
  position_label: string | null;
  attack_label: string | null;
  defense_label: string | null;
  goalkeeper_label: string | null;
};

type SessionAttendanceCardProps = {
  players: Player[];
  presentIds: number[];
  pendingPresenceIds: number[];
  hasResult: boolean;
  isAdmin: boolean;
  showGuestForm: boolean;
  guestName: string;
  guestPosition: Player["preferred_position"] | "";
  guestAgeGroup: Player["age_group"] | "";
  guestSaving: boolean;
  clubSettings: ClubSettings | null;
  onToggleShowGuestForm: () => void;
  onGuestNameChange: (value: string) => void;
  onGuestPositionChange: (value: Player["preferred_position"] | "") => void;
  onGuestAgeGroupChange: (value: Player["age_group"] | "") => void;
  onAddGuestPlayer: () => void;
  onTogglePresence: (playerId: number) => void;
};

function guestBadge(player: Player) {
  return player.is_guest ? (
    <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] text-white">
      Gast
    </span>
  ) : null;
}

export default function SessionAttendanceCard({
  players,
  presentIds,
  pendingPresenceIds,
  hasResult,
  isAdmin,
  showGuestForm,
  guestName,
  guestPosition,
  guestAgeGroup,
  guestSaving,
  clubSettings,
  onToggleShowGuestForm,
  onGuestNameChange,
  onGuestPositionChange,
  onGuestAgeGroupChange,
  onAddGuestPlayer,
  onTogglePresence,
}: SessionAttendanceCardProps) {
  const presentCount = presentIds.length;
  const absentCount = Math.max(players.length - presentCount, 0);

  return (
    <div className="space-y-3 rounded-xl border bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold">Anwesenheit</div>
          <div className="text-[11px] text-slate-500">
            {presentCount} anwesend · {absentCount} nicht gesetzt
          </div>
          {hasResult && (
            <div className="mt-1 text-[11px] text-slate-500">
              Gesperrt, weil bereits ein Ergebnis gespeichert ist.
            </div>
          )}
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={onToggleShowGuestForm}
            disabled={hasResult || guestSaving}
            className={`rounded-lg border bg-white px-3 py-1.5 text-xs shadow-sm ${
              hasResult || guestSaving ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            {showGuestForm ? "Gastformular schließen" : "Gast hinzufügen"}
          </button>
        )}
      </div>

      {isAdmin && showGuestForm && !hasResult && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700">Name</div>
            <input
              value={guestName}
              onChange={(e) => onGuestNameChange(e.target.value)}
              placeholder="z. B. Gastspieler 1"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-xs font-semibold text-slate-700">
                {clubSettings?.position_label ?? "Position"} (optional)
              </div>
              <select
                value={guestPosition ?? ""}
                onChange={(e) =>
                  onGuestPositionChange(
                    e.target.value as Player["preferred_position"] | ""
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Offen</option>
                <option value="goalkeeper">
                  {clubSettings?.goalkeeper_label ?? "Torwart"}
                </option>
                <option value="defense">
                  {clubSettings?.defense_label ?? "Hinten"}
                </option>
                <option value="attack">
                  {clubSettings?.attack_label ?? "Vorne"}
                </option>
              </select>
            </label>

            <label className="block">
              <div className="mb-1 text-xs font-semibold text-slate-700">
                {clubSettings?.category_label ?? "Altersgruppe"} (optional)
              </div>
              <select
                value={guestAgeGroup ?? ""}
                onChange={(e) =>
                  onGuestAgeGroupChange(e.target.value as Player["age_group"] | "")
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Offen</option>
                <option value="AH">AH</option>
                <option value="Ü32">Ü32</option>
              </select>
            </label>
          </div>

          <div className="text-[11px] text-slate-500">
            Gastspieler werden direkt als anwesend hinzugefügt.
          </div>

          <button
            type="button"
            onClick={onAddGuestPlayer}
            disabled={guestSaving}
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {guestSaving ? "Speichere…" : "Gastspieler anlegen"}
          </button>
        </div>
      )}

      {!isAdmin && (
        <div className="text-[11px] text-slate-500">
          Gastspieler können aktuell nur von Admins angelegt werden.
        </div>
      )}

      <div className="text-[11px] text-slate-500">
        Tippe auf einen Spieler, um ihn als anwesend zu markieren oder wieder zu
        entfernen.
      </div>

      <div className="grid gap-2">
        {players.map((player) => {
          const on = presentIds.includes(player.id);
          const isPending = pendingPresenceIds.includes(player.id);

          return (
            <button
              key={player.id}
              type="button"
              onClick={() => onTogglePresence(player.id)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                on ? "bg-emerald-50" : "bg-white"
              } ${hasResult || isPending ? "cursor-not-allowed opacity-60" : ""}`}
              disabled={hasResult || isPending}
              title={
                hasResult
                  ? "Gesperrt: Ergebnis gespeichert"
                  : on
                    ? "Klick: als nicht anwesend markieren"
                    : "Klick: als anwesend markieren"
              }
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">{getPlayerDisplayName(player)}</span>
                {guestBadge(player)}
                {isPending && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                    Speichert…
                  </span>
                )}
              </span>

              <span className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] ${ageBadgeColor(
                    player.age_group
                  )}`}
                >
                  {player.age_group ?? "?"}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] ${badgeColor(
                    player.preferred_position
                  )}`}
                >
                  {positionLabel(player.preferred_position)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}