export type PlayerDisplayFields = {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
};

function clean(value?: string | null) {
  return value?.trim() || '';
}

export function getPlayerDisplayName(player: PlayerDisplayFields) {
  const nickname = clean(player.nickname);
  if (nickname) return nickname;

  const firstName = clean(player.first_name);
  const lastName = clean(player.last_name);

  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;

  const legacyName = clean(player.name);
  if (legacyName) return legacyName;

  return 'Unbekannter Spieler';
}