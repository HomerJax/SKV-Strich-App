import type { AppLocale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";
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

export function formatDate(
  dateString: string | null | undefined,
  locale: AppLocale = "de",
) {
  if (!dateString) return "—";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function getMemberRoleLabel(
  role: MemberRole | string | null | undefined,
  locale: AppLocale = "de",
) {
  if (role === "admin") return translate(locale, "members.roleAdministrator");
  if (role === "power_user") return translate(locale, "members.rolePowerUser");
  return translate(locale, "members.roleMember");
}

export function getErrorText(code: string | undefined, locale: AppLocale = "de") {
  if (!code) return null;

  const key =
    code === "invite_create_failed"
      ? "members.errorInviteCreate"
      : code === "invite_delete_failed"
        ? "members.errorInviteDelete"
        : code === "member_role_update_failed"
          ? "members.errorRoleUpdate"
          : code === "member_remove_failed"
            ? "members.errorRemove"
            : code === "cannot_change_own_role"
              ? "members.errorOwnRole"
              : code === "cannot_remove_yourself"
                ? "members.errorRemoveSelf"
                : code === "last_admin_must_remain"
                  ? "members.errorLastAdmin"
                  : code === "member_not_in_club"
                    ? "members.errorNotInClub"
                    : code === "not_allowed"
                      ? "members.errorNotAllowed"
                      : "members.errorGeneric";

  return translate(locale, key);
}

export function getSuccessText(
  action: string | undefined,
  locale: AppLocale = "de",
) {
  if (!action) return null;

  const key =
    action === "role_updated"
      ? "members.successRoleUpdated"
      : action === "member_removed"
        ? "members.successRemoved"
        : action === "beer_permission_updated"
          ? "members.successBeerPermission"
          : null;

  return key ? translate(locale, key) : null;
}
