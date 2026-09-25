"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getPlayerDisplayName } from "@/lib/player-display";
import PlayerBadge from "@/components/badges/PlayerBadge";
import SessionRsvpButtons from "@/components/sessions/SessionRsvpButtons";
import type { Player } from "./session-types";
import { ageBadgeColor, badgeColor } from "./session-ui";
import { useI18n } from "@/components/i18n/I18nProvider";

type ClubSettings = {
  use_strength: boolean;
  strength_default: number;
  use_categories: boolean;
  category_label: string | null;
  position_label: string | null;
  attack_label: string | null;
  defense_label: string | null;
  goalkeeper_label: string | null;
  require_rsvp_reason_on_absence?: boolean | null;
};

type SessionAttendanceCardProps = {
  sessionId: number;
  currentPlayerId: number | null;
  selfRsvpEnabled: boolean;
  rsvpDeadlineEpochMs: number | null;
  players: Player[];
  presentIds: number[];
  hasResult: boolean;
  isAdmin: boolean;
  showGuestForm: boolean;
  guestName: string;
  guestPosition: Player["preferred_position"] | "";
  guestAgeGroup: Player["age_group"] | "";
  guestStrength: string;
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
  onGuestStrengthChange: (value: string) => void;
  onAddGuestPlayer: () => void;
  onDeleteGuestPlayer: (playerId: number) => void;
  onTogglePresence: (playerId: number) => void;
  onSavePresence: () => void;
};

const ATTENDANCE_SCROLL_KEY = "strikr-session-attendance-scroll-y";

function rememberScrollPosition() {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(ATTENDANCE_SCROLL_KEY, String(window.scrollY));
}

function restoreScrollPosition() {
  if (typeof window === "undefined") return;

  const rawValue = window.sessionStorage.getItem(ATTENDANCE_SCROLL_KEY);
  if (!rawValue) return;

  const scrollY = Number(rawValue);
  if (!Number.isFinite(scrollY)) return;

  window.requestAnimationFrame(() => {
    window.scrollTo({
      top: scrollY,
      behavior: "auto",
    });

    window.sessionStorage.removeItem(ATTENDANCE_SCROLL_KEY);
  });
}

function guestBadge(player: Player, label: string) {
  return player.is_guest ? (
    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
      {label}
    </span>
  ) : null;
}

function getPlayerMvpCount(player: Player) {
  const candidate = (player as Player & { mvp_count?: number | null })
    .mvp_count;
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
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
      {directSaveEnabled
        ? t("attendance.directHint")
        : multiSelectEnabled
          ? t("attendance.multiHint")
          : t("attendance.batchHint")}
    </div>
  );
}

function AttendanceStatus({
  savingPresence,
  directSaveEnabled,
  lastChangedPlayerName,
  justSaved,
}: {
  savingPresence: boolean;
  directSaveEnabled: boolean;
  lastChangedPlayerName: string | null;
  justSaved: boolean;
}) {
  const { t } = useI18n();
  if (savingPresence && directSaveEnabled) {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-800">
        {t("attendance.savingFor", {
          player: lastChangedPlayerName ? ` ${lastChangedPlayerName}` : "",
        })}
      </div>
    );
  }

  if (justSaved) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
        {t("attendance.saved")}
      </div>
    );
  }

  return null;
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
      onClick={() => {
        rememberScrollPosition();
        onClick();
      }}
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
  const { t } = useI18n();
  const categoryLabel = player.category_label ?? null;
  const position =
    player.preferred_position === "goalkeeper"
      ? t("attendance.goalkeeper")
      : player.preferred_position === "defense"
        ? t("attendance.defense")
        : player.preferred_position === "attack"
          ? t("attendance.attack")
          : t("attendance.open");

  return (
    <span className="flex shrink-0 items-center gap-1">
      <span
        className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${ageBadgeColor(
          player.age_group,
        )}`}
      >
        {categoryLabel ?? "?"}
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${badgeColor(
          player.preferred_position,
        )}`}
      >
        {position}
      </span>
    </span>
  );
}

function getPlayerRsvpStatus(player: Player) {
  return (
    (player as Player & { rsvp_status?: "in" | "out" | null }).rsvp_status ??
    null
  );
}

export default function SessionAttendanceCard({
  sessionId,
  currentPlayerId,
  selfRsvpEnabled,
  rsvpDeadlineEpochMs,
  players,
  presentIds,
  hasResult,
  isAdmin,
  showGuestForm,
  guestName,
  guestPosition,
  guestAgeGroup,
  guestStrength,
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
  onGuestStrengthChange,
  onAddGuestPlayer,
  onDeleteGuestPlayer,
  onTogglePresence,
  onSavePresence,
}: SessionAttendanceCardProps) {
  const { t } = useI18n();
  const presentCount = presentIds.length;
  const rsvpAbsentCount = players.filter(
    (player) =>
      !presentIds.includes(player.id) && getPlayerRsvpStatus(player) === "out",
  ).length;
  const openCount = Math.max(
    players.length - presentCount - rsvpAbsentCount,
    0,
  );
  const done = directSaveEnabled
    ? presentCount > 0
    : !dirty && presentCount > 0;

  const wasSavingRef = useRef(false);
  const [lastChangedPlayerId, setLastChangedPlayerId] = useState<number | null>(
    null,
  );
  const [lastChangedPlayerName, setLastChangedPlayerName] = useState<
    string | null
  >(null);
  const [justSaved, setJustSaved] = useState(false);
  const [memberPresentIds, setMemberPresentIds] = useState<number[]>(presentIds);

  const presentIdsSignature = useMemo(
    () => [...presentIds].sort((a, b) => a - b).join(","),
    [presentIds],
  );

  useEffect(() => {
    restoreScrollPosition();
  }, []);

  useEffect(() => {
    restoreScrollPosition();
  }, [presentIdsSignature]);

  useEffect(() => {
    setMemberPresentIds(presentIds);
  }, [presentIdsSignature, presentIds]);

  useEffect(() => {
    if (!wasSavingRef.current || savingPresence) {
      wasSavingRef.current = savingPresence;
      return undefined;
    }

    wasSavingRef.current = savingPresence;

    const showTimeout = window.setTimeout(() => {
      setJustSaved(true);
    }, 0);

    const hideTimeout = window.setTimeout(() => {
      setJustSaved(false);
      setLastChangedPlayerId(null);
      setLastChangedPlayerName(null);
    }, 1800);

    return () => {
      window.clearTimeout(showTimeout);
      window.clearTimeout(hideTimeout);
    };
  }, [savingPresence]);

  function handleTogglePresence(player: Player) {
    if (hasResult || savingPresence) return;

    rememberScrollPosition();

    setLastChangedPlayerId(player.id);
    setLastChangedPlayerName(getPlayerDisplayName(player));
    setJustSaved(false);

    onTogglePresence(player.id);
  }

  function handleSavePresence() {
    rememberScrollPosition();
    setJustSaved(false);
    onSavePresence();
  }

  if (!isAdmin) {
    const acceptedPlayers = players.filter((player) =>
      memberPresentIds.includes(player.id),
    );
    const absentPlayers = players.filter(
      (player) =>
        !memberPresentIds.includes(player.id) &&
        getPlayerRsvpStatus(player) === "out",
    );
    const currentPlayer =
      currentPlayerId !== null
        ? players.find((player) => player.id === currentPlayerId) ?? null
        : null;
    const selfStatus: "in" | "out" | "open" =
      currentPlayerId !== null && memberPresentIds.includes(currentPlayerId)
        ? "in"
        : currentPlayer && getPlayerRsvpStatus(currentPlayer) === "out"
          ? "out"
          : "open";

    return (
      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                {t("attendance.whoIn")}
              </div>
              <div className="mt-1 text-xl font-black tracking-[-0.035em] text-slate-950">
                {acceptedPlayers.length > 0
                  ? acceptedPlayers.length === 1
                    ? t("attendance.oneGoing")
                    : t("attendance.goingCount", { count: acceptedPlayers.length })
                  : t("attendance.noneGoing")}
              </div>
              <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                {t("attendance.onlyConfirmedHint")}
              </p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-sm">
              {acceptedPlayers.length}
            </span>
          </div>
        </div>

        <div className="p-4">
          <div className="grid gap-3">
            <div className="overflow-hidden rounded-[20px] border border-emerald-100 bg-emerald-50/50">
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="text-sm font-black text-slate-950">{t("attendance.going")}</div>
                <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white">
                  {acceptedPlayers.length}
                </span>
              </div>
              <div className="grid gap-2 border-t border-emerald-100 bg-white/70 p-3 sm:grid-cols-2">
                {acceptedPlayers.length > 0 ? acceptedPlayers.map((player) => {
                  const playerName = getPlayerDisplayName(player);
                  return (
                    <div key={player.id} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 ring-1 ring-slate-950/5">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 bg-cover bg-center text-xs font-black uppercase text-white shadow-sm"
                        style={player.photo_url ? { backgroundImage: `url("${player.photo_url}")` } : undefined}
                      >
                        {!player.photo_url ? playerName.trim().charAt(0) || "?" : null}
                      </span>
                      <div className="min-w-0 truncate text-sm font-black text-slate-900">{playerName}</div>
                    </div>
                  );
                }) : (
                  <div className="text-xs font-medium text-slate-500">{t("attendance.noGoing")}</div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-[20px] border border-rose-100 bg-rose-50/50">
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="text-sm font-black text-slate-950">{t("attendance.out")}</div>
                <span className="rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-black text-white">
                  {absentPlayers.length}
                </span>
              </div>
              <div className="grid gap-2 border-t border-rose-100 bg-white/70 p-3 sm:grid-cols-2">
                {absentPlayers.length > 0 ? absentPlayers.map((player) => {
                  const playerName = getPlayerDisplayName(player);
                  return (
                    <div key={player.id} className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-slate-950/5">
                      <div className="text-sm font-black text-slate-900">{playerName}</div>
                      <div className={`mt-1 text-[11px] ${player.rsvp_reason ? "font-semibold text-rose-700" : "text-slate-400"}`}>
                        {player.rsvp_reason ? `„${player.rsvp_reason}“` : t("attendance.noReason")}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-xs font-medium text-slate-500">{t("attendance.noOut")}</div>
                )}
              </div>
            </div>
          </div>

          {selfRsvpEnabled && currentPlayerId !== null ? (
            <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50 p-3.5">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                {t("attendance.yourRsvp")}
              </div>
              <SessionRsvpButtons
                sessionId={sessionId}
                initialStatus={selfStatus}
                deadlineEpochMs={rsvpDeadlineEpochMs}
                requireAbsenceReason={clubSettings?.require_rsvp_reason_on_absence === true}
                onStatusChange={(nextStatus) => {
                  setMemberPresentIds((currentIds) => {
                    const withoutSelf = currentIds.filter(
                      (playerId) => playerId !== currentPlayerId,
                    );
                    return nextStatus === "in"
                      ? [...withoutSelf, currentPlayerId]
                      : withoutSelf;
                  });
                }}
              />
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (collapsed) {
    return (
      <section className="rounded-[20px] border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => {
            rememberScrollPosition();
            onToggleCollapsed();
          }}
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
                {done ? t("attendance.confirmed") : t("attendance.title")}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <SectionSummaryPill tone={done ? "success" : "default"}>
                  {t("attendance.presentCount", { count: presentCount })}
                </SectionSummaryPill>

                {rsvpAbsentCount > 0 ? (
                  <SectionSummaryPill tone="muted">
                    {t("attendance.outCount", { count: rsvpAbsentCount })}
                  </SectionSummaryPill>
                ) : null}

                {!done ? (
                  <SectionSummaryPill tone="muted">
                    {t("attendance.openCount", { count: openCount })}
                  </SectionSummaryPill>
                ) : null}

                {!directSaveEnabled && dirty ? (
                  <SectionSummaryPill tone="muted">
                    {t("attendance.changesOpen")}
                  </SectionSummaryPill>
                ) : null}

                {savingPresence ? (
                  <SectionSummaryPill tone="muted">
                    {t("attendance.saving")}
                  </SectionSummaryPill>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            {t("attendance.edit")}
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
                  {t("attendance.title")}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <SectionSummaryPill>
                    {t("attendance.presentCount", { count: presentCount })}
                  </SectionSummaryPill>
                  {rsvpAbsentCount > 0 ? (
                    <SectionSummaryPill tone="muted">
                      {t("attendance.outCount", { count: rsvpAbsentCount })}
                    </SectionSummaryPill>
                  ) : null}
                  <SectionSummaryPill tone="muted">
                    {t("attendance.openCount", { count: openCount })}
                  </SectionSummaryPill>
                  {!directSaveEnabled && dirty ? (
                    <SectionSummaryPill tone="muted">
                      {t("attendance.changesOpen")}
                    </SectionSummaryPill>
                  ) : null}
                  {savingPresence ? (
                    <SectionSummaryPill tone="muted">
                      {t("attendance.saving")}
                    </SectionSummaryPill>
                  ) : null}
                </div>
              </div>
            </div>

            {hasResult ? (
              <div className="mt-3 text-[11px] text-slate-500">
                {t("attendance.lockedResult")}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              rememberScrollPosition();
              onToggleCollapsed();
            }}
            className="shrink-0 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t("attendance.confirm")}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!hasResult && !directSaveEnabled ? (
            <ControlButton
              onClick={handleSavePresence}
              disabled={!dirty || savingPresence}
              tone="primary"
            >
              {savingPresence ? t("profile.saving") : t("attendance.save")}
            </ControlButton>
          ) : null}

          {isAdmin ? (
            <ControlButton
              onClick={onToggleShowGuestForm}
              disabled={hasResult || guestSaving}
            >
              {showGuestForm ? t("attendance.closeGuestForm") : t("attendance.addGuest")}
            </ControlButton>
          ) : null}

          <button
            type="button"
            onClick={() => {
              rememberScrollPosition();
              onToggleMultiSelect();
            }}
            disabled={hasResult || savingPresence}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
              multiSelectEnabled
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            } ${hasResult || savingPresence ? "cursor-not-allowed opacity-60" : ""}`}
            title={t("attendance.multiSelectTitle")}
          >
            <ToggleSwitch
              active={multiSelectEnabled}
              disabled={hasResult || savingPresence}
            />
            {t("attendance.multiSelect")}
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <AttendanceHint
          directSaveEnabled={directSaveEnabled}
          multiSelectEnabled={multiSelectEnabled}
        />

        <AttendanceStatus
          savingPresence={savingPresence}
          directSaveEnabled={directSaveEnabled}
          lastChangedPlayerName={lastChangedPlayerName}
          justSaved={justSaved}
        />

        {isAdmin && showGuestForm && !hasResult ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">
              {t("attendance.addGuestTitle")}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {t("attendance.addGuestHint")}
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1.5 text-xs font-semibold text-slate-700">
                  {t("attendance.name")}
                </div>
                <input
                  value={guestName}
                  onChange={(e) => onGuestNameChange(e.target.value)}
                  placeholder={t("attendance.guestPlaceholder")}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500"
                />
              </div>

              <div className={`grid gap-3 ${clubSettings?.use_strength ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                <label className="block">
                  <div className="mb-1.5 text-xs font-semibold text-slate-700">
                    {t("attendance.positionOptional", {
                      label: clubSettings?.position_label ?? t("attendance.position"),
                    })}
                  </div>
                  <select
                    value={guestPosition ?? ""}
                    onChange={(e) =>
                      onGuestPositionChange(
                        e.target.value as Player["preferred_position"] | "",
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500"
                  >
                    <option value="">{t("attendance.open")}</option>
                    <option value="goalkeeper">
                      {clubSettings?.goalkeeper_label ?? t("attendance.goalkeeper")}
                    </option>
                    <option value="defense">
                      {clubSettings?.defense_label ?? t("attendance.defense")}
                    </option>
                    <option value="attack">
                      {clubSettings?.attack_label ?? t("attendance.attack")}
                    </option>
                  </select>
                </label>

                <label className="block">
                  <div className="mb-1.5 text-xs font-semibold text-slate-700">
                    {t("attendance.positionOptional", {
                      label: clubSettings?.category_label ?? t("attendance.ageGroup"),
                    })}
                  </div>
                  <select
                    value={guestAgeGroup ?? ""}
                    onChange={(e) =>
                      onGuestAgeGroupChange(
                        e.target.value as Player["age_group"] | "",
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500"
                  >
                    <option value="">{t("attendance.open")}</option>
                    <option value="AH">AH</option>
                    <option value="Ü32">Ü32</option>
                  </select>
                </label>

                {clubSettings?.use_strength ? (
                  <label className="block">
                    <div className="mb-1.5 text-xs font-semibold text-slate-700">
                      {t("attendance.strengthOptional")}
                    </div>
                    <select
                      value={guestStrength}
                      onChange={(e) => onGuestStrengthChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500"
                    >
                      <option value="">
                        {t("attendance.unknownStrength", {
                          value: clubSettings.strength_default ?? 3,
                        })}
                      </option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </label>
                ) : null}
              </div>

              <div className="pt-1">
                <ControlButton
                  onClick={onAddGuestPlayer}
                  disabled={guestSaving}
                  tone="primary"
                >
                  {guestSaving ? t("attendance.savingGuest") : t("attendance.createGuest")}
                </ControlButton>
              </div>
            </div>
          </div>
        ) : null}

        {!isAdmin ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            {t("attendance.guestAdminOnly")}
          </div>
        ) : null}

        <div className="grid gap-1.5">
          {players.map((player) => {
            const isPresent = presentIds.includes(player.id);
            const isAbsent =
              !isPresent && getPlayerRsvpStatus(player) === "out";
            const mvpCount = getPlayerMvpCount(player);
            const isDeletingGuest = deletingGuestPlayerId === player.id;
            const canDeleteGuest = isAdmin && player.is_guest && !hasResult;
            const isLastChanged = lastChangedPlayerId === player.id;

            return (
              <div
                key={player.id}
                className={`flex items-center gap-2 ${
                  hasResult ? "opacity-60" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleTogglePresence(player)}
                  disabled={hasResult || savingPresence || isDeletingGuest}
                  title={
                    hasResult
                      ? t("attendance.lockedTitle")
                      : isPresent
                        ? t("attendance.markAbsent")
                        : isAbsent
                          ? t("attendance.markPresentAfterOut")
                          : t("attendance.markPresent")
                  }
                  className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-sm transition ${
                    isPresent
                      ? "border-emerald-200 bg-emerald-50"
                      : isAbsent
                        ? "border-rose-200 bg-rose-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                  } ${
                    isLastChanged && savingPresence
                      ? "ring-2 ring-blue-200"
                      : ""
                  } ${hasResult ? "cursor-not-allowed" : ""}`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        isPresent
                          ? "bg-emerald-600 text-white"
                          : isAbsent
                            ? "bg-rose-600 text-white"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isPresent ? "✓" : isAbsent ? "×" : ""}
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

                        {guestBadge(player, t("attendance.guest"))}
                      </span>
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    {isLastChanged && savingPresence ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold text-blue-700">
                        {t("attendance.saving")}
                      </span>
                    ) : null}

                    {isAbsent ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-semibold text-rose-700">
                        {t("attendance.declined")}
                      </span>
                    ) : null}

                    <PlayerMetaChips player={player} />
                  </span>
                </button>

                {canDeleteGuest ? (
                  <button
                    type="button"
                    onClick={() => {
                      rememberScrollPosition();
                      onDeleteGuestPlayer(player.id);
                    }}
                    disabled={savingPresence || isDeletingGuest}
                    title={t("attendance.deleteGuestTitle")}
                    className="inline-flex shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeletingGuest ? t("attendance.deleting") : t("attendance.deleteGuest")}
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
                ? t("attendance.unsaved")
                : t("attendance.saved")}
            </div>

            <ControlButton
              onClick={handleSavePresence}
              disabled={!dirty || savingPresence}
              tone="primary"
            >
              {savingPresence ? t("profile.saving") : t("attendance.save")}
            </ControlButton>
          </div>
        ) : null}
      </div>
    </section>
  );
}
