import { getPlayerDisplayName } from "@/lib/player-display";
import type { PlayerRow } from "./members-types";

export function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function buildInviteUrl(token: string) {
  return `${getBaseUrl()}/invite/${token}`;
}

export function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

export function sortPlayersByDisplayName(players: PlayerRow[]) {
  return [...players].sort((a, b) =>
    getPlayerDisplayName(a).localeCompare(getPlayerDisplayName(b), "de")
  );
}

export function getErrorText(code?: string) {
  if (!code) return null;

  return code === "invite_create_failed"
    ? "Die Einladung konnte nicht erstellt werden."
    : code === "invite_delete_failed"
      ? "Die Einladung konnte nicht gelöscht werden."
      : code === "member_role_update_failed"
        ? "Die Rolle konnte nicht geändert werden."
        : code === "member_remove_failed"
          ? "Das Mitglied konnte nicht entfernt werden."
          : code === "cannot_change_own_role"
            ? "Du kannst deine eigene Rolle nicht ändern."
            : code === "cannot_remove_yourself"
              ? "Du kannst dich nicht selbst entfernen."
              : code === "last_admin_must_remain"
                ? "Mindestens ein Administrator muss im Club verbleiben."
                : code === "member_player_link_failed"
                  ? "Die Spieler-Verknüpfung konnte nicht gespeichert werden."
                  : code === "player_not_in_club"
                    ? "Der ausgewählte Spieler gehört nicht zu diesem Club."
                    : code === "player_already_linked"
                      ? "Dieser Spieler ist bereits mit einem anderen Mitglied verknüpft."
                      : code === "member_not_in_club"
                        ? "Dieses Mitglied gehört nicht zu deinem Club."
                        : code === "not_allowed"
                          ? "Diese Aktion ist nicht erlaubt."
                          : "Es ist ein Fehler aufgetreten.";
}

export function getSuccessText(action?: string) {
  if (!action) return null;

  return action === "role_updated"
    ? "Die Rolle wurde erfolgreich geändert."
    : action === "member_removed"
      ? "Das Mitglied wurde erfolgreich entfernt."
      : action === "player_linked"
        ? "Mitglied und Spieler wurden erfolgreich verknüpft."
        : action === "player_unlinked"
          ? "Die Spieler-Verknüpfung wurde entfernt."
          : null;
}