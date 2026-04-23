import { getPlayerDisplayName } from "@/lib/player-display";
import PlayerBadge from "@/components/badges/PlayerBadge";
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
  hasResult: boolean;
  isAdmin: boolean;
  showGuestForm: boolean;
  guestName: string;
  guestPosition: Player["preferred_position"] | "";
  guestAgeGroup: Player["age_group"] | "";
  guestSaving: boolean;
  clubSettings: ClubSettings | null;
  collapsed: boolean;
  savingPresence: boolean;
  dirty: boolean;
  directSaveEnabled: boolean;
  multiSelectEnabled: boolean;
  deletingGuestPlayerId?: number | null;
  onToggleMultiSelect: () => void;
  onToggleCollapsed: () => void;
  onToggleShowGuestForm: () => void;
  onGuestNameChange: (value: string) => void;
  onGuestPositionChange: (value: Player["preferred_position"] | "") => void;
  onGuestAgeGroupChange: (value: Player["age_group"] | "") => void;
  onAddGuestPlayer: () => void;
  onDeleteGuestPlayer: (playerId: number) => void;
  onTogglePresence: (playerId: number) => void;
  onSavePresence: () => void;
};

function guestBadge(player: Player) {
  return player.is_guest ? (
    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
      Gast
    </span>
  ) : null;
}

function getPlayerMvpCount(player: Player) {
  const candidate = (player as Player & { mvp_count?: number | null }).mvp_count;
  return typeof candidate === "number" && Number.isFinite(candidate)
    ? candidate
    : 0;
}

function AttendanceHint({
  directSaveEnabled,
  multiSelectEnabled,
}: {
  directSaveEnabled: boolean;
  multiSelectEnabled: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
      {directSaveEnabled
        ? "Spieler antippen – Änderungen werden direkt gespeichert."
        : multiSelectEnabled
          ? "Mehrfachauswahl aktiv – Spieler antippen und danach speichern."
          : "Spieler antippen, dann gesammelt speichern."}
    </div>
  );
}

function SectionSummaryPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "muted";
}) {
  const className =
    tone === "success"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "muted"
        ? "bg-slate-100 text-slate-600"
        : "bg-white text-slate-700 ring-1 ring-slate-200";

  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}
    >
      {children}
    </div>
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
  tone?: "default" | "primary";
}) {
  const className =
    tone === "primary"
      ? "bg-slate-950 text-white hover:bg-slate-800"
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

function ToggleSwitch({
  active,
  disabled,
}: {
  active: boolean;
  disabled?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-4 w-7 items-center rounded-full transition ${
        active ? "bg-white/20" : "bg-slate-200"
      } ${disabled ? "opacity-70" : ""}`}
    >
      <span
        className={`h-3 w-3 rounded-full bg-white transition ${
          active ? "translate-x-3.5" : "translate-x-0.5 bg-slate-500"
        }`}
      />
    </span>
  );
}

function PlayerMetaChips({ player }: { player: Player }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      <span
        className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${ageBadgeColor(
          player.age_group
        )}`}
      >
        {player.age_group ?? "?"}
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${badgeColor(
          player.preferred_position
        )}`}
      >
        {positionLabel(player.preferred_position)}
      </span>
    </span>
  );
}

export default function SessionAttendanceCard({
  players,
  presentIds,
  hasResult,
  isAdmin,
  showGuestForm,
  guestName,
  guestPosition,
  guestAgeGroup,
  guestSaving,
  clubSettings,
  collapsed,
  savingPresence,
  dirty,
  directSaveEnabled,
  multiSelectEnabled,
  deletingGuestPlayerId = null,
  onToggleMultiSelect,
  onToggleCollapsed,
  onToggleShowGuestForm,
  onGuestNameChange,
  onGuestPositionChange,
  onGuestAgeGroupChange,
  onAddGuestPlayer,
  onDeleteGuestPlayer,
  onTogglePresence,
  onSavePresence,
}: SessionAttendanceCardProps) {
  const presentCount = presentIds.length;
  const absentCount = Math.max(players.length - presentCount, 0);
  const done = directSaveEnabled ? presentCount > 0 : !dirty && presentCount > 0;

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
                1
              </span>
            )}

            <div className="min-w-0">
              <div
                className={`text-sm font-bold sm:text-base ${
                  done ? "text-emerald-950" : "text-slate-950"
                }`}
              >
                {done ? "Anwesenheit erledigt" : "Anwesenheit"}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <SectionSummaryPill tone={done ? "success" : "default"}>
                  {presentCount} anwesend
                </SectionSummaryPill>

                {!done ? (
                  <SectionSummaryPill tone="muted">
                    {absentCount} offen
                  </SectionSummaryPill>
                ) : null}

                {!directSaveEnabled && dirty ? (
                  <SectionSummaryPill tone="muted">
                    Änderungen offen
                  </SectionSummaryPill>
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
                1
              </div>

              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  Anwesenheit
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <SectionSummaryPill>{presentCount} anwesend</SectionSummaryPill>
                  <SectionSummaryPill tone="muted">
                    {absentCount} offen
                  </SectionSummaryPill>
                  {!directSaveEnabled && dirty ? (
                    <SectionSummaryPill tone="muted">
                      Änderungen offen
                    </SectionSummaryPill>
                  ) : null}
                </div>
              </div>
            </div>

            {hasResult ? (
              <div className="mt-3 text-[11px] text-slate-500">
                Gesperrt, weil bereits ein Ergebnis gespeichert ist.
              </div>
            ) : null}
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
          {!hasResult && !directSaveEnabled ? (
            <ControlButton
              onClick={onSavePresence}
              disabled={!dirty || savingPresence}
              tone="primary"
            >
              {savingPresence ? "Speichert..." : "Anwesenheit speichern"}
            </ControlButton>
          ) : null}

          {isAdmin ? (
            <ControlButton
              onClick={onToggleShowGuestForm}
              disabled={hasResult || guestSaving}
            >
              {showGuestForm ? "Gastformular schließen" : "Gast hinzufügen"}
            </ControlButton>
          ) : null}

          <button
            type="button"
            onClick={onToggleMultiSelect}
            disabled={hasResult || savingPresence}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
              multiSelectEnabled
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            } ${hasResult || savingPresence ? "cursor-not-allowed opacity-60" : ""}`}
            title="Mehrfachauswahl aktivieren oder deaktivieren"
          >
            <ToggleSwitch
              active={multiSelectEnabled}
              disabled={hasResult || savingPresence}
            />
            Mehrfachauswahl
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <AttendanceHint
          directSaveEnabled={directSaveEnabled}
          multiSelectEnabled={multiSelectEnabled}
        />

        {isAdmin && showGuestForm && !hasResult ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">
              Gastspieler hinzufügen
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Gastspieler werden direkt als anwesend hinzugefügt.
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1.5 text-xs font-semibold text-slate-700">
                  Name
                </div>
                <input
                  value={guestName}
                  onChange={(e) => onGuestNameChange(e.target.value)}
                  placeholder="z. B. Gastspieler 1"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-1.5 text-xs font-semibold text-slate-700">
                    {clubSettings?.position_label ?? "Position"} (optional)
                  </div>
                  <select
                    value={guestPosition ?? ""}
                    onChange={(e) =>
                      onGuestPositionChange(
                        e.target.value as Player["preferred_position"] | ""
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500"
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
                  <div className="mb-1.5 text-xs font-semibold text-slate-700">
                    {clubSettings?.category_label ?? "Altersgruppe"} (optional)
                  </div>
                  <select
                    value={guestAgeGroup ?? ""}
                    onChange={(e) =>
                      onGuestAgeGroupChange(e.target.value as Player["age_group"] | "")
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500"
                  >
                    <option value="">Offen</option>
                    <option value="AH">AH</option>
                    <option value="Ü32">Ü32</option>
                  </select>
                </label>
              </div>

              <div className="pt-1">
                <ControlButton
                  onClick={onAddGuestPlayer}
                  disabled={guestSaving}
                  tone="primary"
                >
                  {guestSaving ? "Speichere..." : "Gastspieler anlegen"}
                </ControlButton>
              </div>
            </div>
          </div>
        ) : null}

        {!isAdmin ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            Gastspieler können aktuell nur von Admins angelegt werden.
          </div>
        ) : null}

        <div className="grid gap-1.5">
          {players.map((player) => {
            const isPresent = presentIds.includes(player.id);
            const mvpCount = getPlayerMvpCount(player);
            const isDeletingGuest = deletingGuestPlayerId === player.id;
            const canDeleteGuest = isAdmin && player.is_guest && !hasResult;

            return (
              <div
                key={player.id}
                className={`flex items-center gap-2 ${
                  hasResult ? "opacity-60" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => onTogglePresence(player.id)}
                  disabled={hasResult || savingPresence || isDeletingGuest}
                  title={
                    hasResult
                      ? "Gesperrt: Ergebnis gespeichert"
                      : isPresent
                        ? "Klick: als nicht anwesend markieren"
                        : "Klick: als anwesend markieren"
                  }
                  className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-sm transition ${
                    isPresent
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  } ${hasResult ? "cursor-not-allowed" : ""}`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        isPresent
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isPresent ? "✓" : ""}
                    </span>

                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-slate-900">
                          {getPlayerDisplayName(player)}
                        </span>

                        <PlayerBadge
                          mvpCount={mvpCount}
                          size="sm"
                          hideIfNone
                          iconOnly
                        />

                        {guestBadge(player)}
                      </span>
                    </span>
                  </span>

                  <PlayerMetaChips player={player} />
                </button>

                {canDeleteGuest ? (
                  <button
                    type="button"
                    onClick={() => onDeleteGuestPlayer(player.id)}
                    disabled={savingPresence || isDeletingGuest}
                    title="Gastspieler aus dieser Session löschen"
                    className="inline-flex shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeletingGuest ? "Löscht..." : "Gast löschen"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>

        {!hasResult && !directSaveEnabled ? (
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              {dirty
                ? "Änderungen noch nicht gespeichert."
                : "Anwesenheit ist gespeichert."}
            </div>

            <ControlButton
              onClick={onSavePresence}
              disabled={!dirty || savingPresence}
              tone="primary"
            >
              {savingPresence ? "Speichert..." : "Anwesenheit speichern"}
            </ControlButton>
          </div>
        ) : null}
      </div>
    </section>
  );
}