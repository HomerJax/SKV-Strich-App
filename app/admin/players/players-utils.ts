import { getPlayerDisplayName } from "@/lib/player-display";
import type { Player } from "./players-types";

export function getErrorMessage(e: unknown, fallback: string) {
  if (
    e &&
    typeof e === "object" &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  ) {
    return (e as { message: string }).message;
  }
  return fallback;
}

export function toStrength(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return Math.max(1, Math.min(5, n));
}

export function clean(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export function buildLegacyName(player: {
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
}) {
  const nickname = clean(player.nickname);
  if (nickname) return nickname;

  const firstName = clean(player.first_name);
  const lastName = clean(player.last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || "Unbekannter Spieler";
}

export function sortPlayersByDisplayName(list: Player[]) {
  return [...list].sort((a, b) =>
    getPlayerDisplayName(a).localeCompare(getPlayerDisplayName(b), "de")
  );
}

export function matchesPlayerSearch(player: Player, term: string) {
  const q = term.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    player.name,
    player.first_name,
    player.last_name,
    player.nickname,
    getPlayerDisplayName(player),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}