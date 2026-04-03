import type { MemberRole } from "./members-types";

export function getBaseUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "";

  return envUrl.replace(/\/$/, "");
}

export function buildInviteUrl(token: string) {
  const path = `/join?token=${encodeURIComponent(token)}`;
  const baseUrl = getBaseUrl();

  return baseUrl ? `${baseUrl}${path}` : path;
}

export function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

export function getMemberRoleLabel(
  role: MemberRole | string | null | undefined
) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Administrator";
  return "Mitglied";
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
      : null;
}