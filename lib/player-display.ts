export type PlayerDisplayFields = {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
};

type PlayerDisplayOptions = {
  useNicknames?: boolean;
};

function clean(value?: string | null) {
  return value?.trim() || "";
}

export function getPlayerDisplayName(
  player: PlayerDisplayFields,
  options?: PlayerDisplayOptions
) {
  const useNicknames = options?.useNicknames ?? false;

  const firstName = clean(player.first_name);
  const lastName = clean(player.last_name);
  const nickname = clean(player.nickname);
  const legacyName = clean(player.name);

  if (useNicknames && nickname) {
    return nickname;
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;

  if (legacyName) return legacyName;
  if (nickname) return nickname;

  return "Unbekannter Spieler";
}