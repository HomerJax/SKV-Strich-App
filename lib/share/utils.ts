export type ShareImageFromUrlParams = {
  imageUrl: string;
  fileName?: string;
  title?: string;
  text?: string;
};

type ShareNameLike = {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
};

export function trimName(value: string, maxLength = 18) {
  const clean = value.trim();

  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

export function buildPlayerDisplayName(player: ShareNameLike) {
  const nickname = player.nickname?.trim();
  if (nickname) return nickname;

  const firstName = player.first_name?.trim();
  const lastName = player.last_name?.trim();

  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  if (lastName) return lastName;

  const fallback = player.name?.trim();
  if (fallback) return fallback;

  return "Unbekannt";
}

export function formatDate(date: string | null | undefined) {
  if (!date) return "Unbekanntes Datum";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isIOS() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor || "";
  return /iPad|iPhone|iPod/.test(ua);
}

function openImageFallback(url: string) {
  if (typeof window === "undefined") return;

  const absoluteUrl = new URL(url, window.location.origin).toString();
  window.open(absoluteUrl, "_blank", "noopener,noreferrer");
}

async function fetchImageAsFile(url: string, fileName: string) {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Bild konnte nicht geladen werden.");
  }

  const blob = await response.blob();

  const contentType =
    blob.type && blob.type.startsWith("image/") ? blob.type : "image/png";

  const safeFileName = fileName.includes(".") ? fileName : `${fileName}.png`;

  return new File([blob], safeFileName, {
    type: contentType,
    lastModified: Date.now(),
  });
}

export async function shareImageFromUrl({
  imageUrl,
  fileName = "strikr-share.png",
  title = "SiegerCard",
  text = "SiegerCard aus Strikr",
}: ShareImageFromUrlParams) {
  if (typeof window === "undefined") {
    throw new Error("Teilen ist hier nicht verfügbar.");
  }

  const absoluteUrl = new URL(imageUrl, window.location.origin).toString();
  const canUseNavigatorShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  if (canUseNavigatorShare) {
    try {
      const file = await fetchImageAsFile(absoluteUrl, fileName);
      const shareDataWithFile = {
        title,
        text,
        files: [file],
      };

      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare(shareDataWithFile)
      ) {
        await navigator.share(shareDataWithFile);
        return;
      }
    } catch {
      // fallback below
    }
  }

  if (canUseNavigatorShare) {
    try {
      await navigator.share({
        title,
        text,
        url: absoluteUrl,
      });
      return;
    } catch {
      // fallback below
    }
  }

  openImageFallback(absoluteUrl);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(absoluteUrl);
    }
  } catch {
    // ignore clipboard errors
  }

  if (!isIOS()) {
    return;
  }
}