export type PlayerDisplayFields = {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
};

type PlayerDisplayOptions = {
  useNicknames?: boolean;
  withFallbackName?: boolean;
};

function clean(value?: string | null) {
  return value?.trim() || "";
}

export function getPlayerFullName(player: PlayerDisplayFields) {
  const firstName = clean(player.first_name);
  const lastName = clean(player.last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (fullName) return fullName;

  const legacyName = clean(player.name);
  if (legacyName) return legacyName;

  const nickname = clean(player.nickname);
  if (nickname) return nickname;

  return "Unbekannter Spieler";
}

export function getPlayerDisplayName(
  player: PlayerDisplayFields,
  options?: PlayerDisplayOptions
) {
  const useNicknames = options?.useNicknames ?? false;
  const withFallbackName = options?.withFallbackName ?? true;

  const nickname = clean(player.nickname);

  if (useNicknames && nickname) {
    return nickname;
  }

  const fullName = getPlayerFullName(player);
  if (fullName && fullName !== "Unbekannter Spieler") {
    return fullName;
  }

  if (withFallbackName && nickname) {
    return nickname;
  }

  return "Unbekannter Spieler";
}

export function getPlayerFirstName(player: PlayerDisplayFields) {
  const firstName = clean(player.first_name);
  if (firstName) return firstName;

  const fullName = getPlayerFullName(player);
  if (!fullName || fullName === "Unbekannter Spieler") return "";

  return fullName.split(" ")[0] || "";
}

export function comparePlayersByFirstName(
  a: PlayerDisplayFields,
  b: PlayerDisplayFields
) {
  const firstA = getPlayerFirstName(a);
  const firstB = getPlayerFirstName(b);

  const firstCompare = firstA.localeCompare(firstB, "de", {
    sensitivity: "base",
  });
  if (firstCompare !== 0) return firstCompare;

  const fullA = getPlayerFullName(a);
  const fullB = getPlayerFullName(b);

  return fullA.localeCompare(fullB, "de", {
    sensitivity: "base",
  });
}