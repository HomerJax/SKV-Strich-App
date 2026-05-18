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

async function fetchImageBlob(url: string) {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Bild konnte nicht geladen werden (HTTP ${response.status}).`);
  }

  return response.blob();
}

export async function fetchImageAsFile(url: string, fileName: string) {
  const blob = await fetchImageBlob(url);

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

  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    throw new Error("Teilen wird auf diesem Gerät oder Browser nicht unterstützt.");
  }

  const absoluteUrl = new URL(imageUrl, window.location.origin).toString();
  const file = await fetchImageAsFile(absoluteUrl, fileName);

  if (typeof navigator.canShare === "function") {
    const canShareFiles = navigator.canShare({
      files: [file],
    });

    if (!canShareFiles) {
      throw new Error(
        "Dieser Browser unterstützt das direkte Teilen von Bilddateien hier nicht."
      );
    }
  }

  try {
    await navigator.share({
      files: [file],
      title,
      text,
    });

    return {
      mode: "shared_file" as const,
    };
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "";

    if (errorName === "AbortError") {
      return {
        mode: "cancelled" as const,
      };
    }

    throw new Error(
      error instanceof Error
        ? error.message
        : "SiegerCard konnte nicht geteilt werden."
    );
  }
}