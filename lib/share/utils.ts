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
    throw new Error("Bild konnte nicht geladen werden.");
  }

  return response.blob();
}

async function fetchImageAsFile(url: string, fileName: string) {
  const blob = await fetchImageBlob(url);

  const contentType =
    blob.type && blob.type.startsWith("image/") ? blob.type : "image/png";

  const safeFileName = fileName.includes(".") ? fileName : `${fileName}.png`;

  return new File([blob], safeFileName, {
    type: contentType,
    lastModified: Date.now(),
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  if (typeof window === "undefined") {
    throw new Error("Download ist hier nicht verfügbar.");
  }

  const safeFileName = fileName.includes(".") ? fileName : `${fileName}.png`;
  const objectUrl = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = safeFileName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
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

  let lastError: unknown = null;

  if (canUseNavigatorShare) {
    try {
      const file = await fetchImageAsFile(absoluteUrl, fileName);

      const fileOnlyShareData = {
        files: [file],
      };

      const fullShareData = {
        files: [file],
        title,
        text,
      };

      const canShareFiles =
        typeof navigator.canShare !== "function" ||
        navigator.canShare(fileOnlyShareData);

      if (canShareFiles) {
        await navigator.share(fullShareData);
        return {
          mode: "shared_file" as const,
        };
      }
    } catch (error) {
      lastError = error;
    }
  }

  try {
    const blob = await fetchImageBlob(absoluteUrl);
    downloadBlob(blob, fileName);
    return {
      mode: "downloaded" as const,
    };
  } catch (error) {
    lastError = error;
  }

  throw new Error(
    lastError instanceof Error
      ? lastError.message
      : "SiegerCard konnte weder geteilt noch heruntergeladen werden."
  );
}