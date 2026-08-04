export function normalizeInviteOrigin(origin: string) {
  const fallback = origin.replace(/\/$/, "");

  try {
    const url = new URL(fallback);

    if (url.hostname === "strikr.team") {
      url.hostname = "www.strikr.team";
    }

    return url.origin;
  } catch {
    return fallback;
  }
}

export function buildAbsoluteInviteUrl(origin: string, token: string) {
  return `${normalizeInviteOrigin(origin)}/join?token=${encodeURIComponent(token)}`;
}
