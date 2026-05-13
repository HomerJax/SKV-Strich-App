export type ShareImageFromUrlParams = {
  imageUrl: string;
  fileName?: string;
  title?: string;
  text?: string;
};

export type FetchShareImageFileOptions = {
  minBytes?: number;
  retries?: number;
  cacheBust?: boolean;
};

type ShareNameLike = {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
};

const DEFAULT_MIN_SHARE_IMAGE_BYTES = 12_000;

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

function getAbsoluteUrl(url: string) {
  if (typeof window === "undefined") {
    return url;
  }

  return new URL(url, window.location.origin).toString();
}

function withCacheBust(url: string) {
  const absoluteUrl = getAbsoluteUrl(url);

  try {
    const parsed = new URL(absoluteUrl);
    parsed.searchParams.set("_share_ts", String(Date.now()));
    parsed.searchParams.set("_share_r", Math.random().toString(36).slice(2));
    return parsed.toString();
  } catch {
    const joiner = absoluteUrl.includes("?") ? "&" : "?";
    return `${absoluteUrl}${joiner}_share_ts=${Date.now()}`;
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function assertImageDecodable(blob: Blob) {
  if (typeof window === "undefined") {
    return;
  }

  if (!blob.type.startsWith("image/")) {
    throw new Error("Die erzeugte Datei ist kein gültiges Bild.");
  }

  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Share-Bild konnte nicht dekodiert werden."));
      image.src = objectUrl;
    });

    if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      throw new Error("Share-Bild ist leer oder beschädigt.");
    }

    if (typeof image.decode === "function") {
      try {
        await image.decode();
      } catch {
        // Browser können decode() trotz erfolgreichem load ablehnen.
        // load + natural dimensions reichen hier als robuste Prüfung.
      }
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function fetchImageBlob(url: string, minBytes: number) {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Bild konnte nicht geladen werden (HTTP ${response.status}).`);
  }

  const blob = await response.blob();

  if (!blob || blob.size < minBytes) {
    throw new Error(
      `Share-Bild wirkt unvollständig (${blob?.size ?? 0} Bytes).`
    );
  }

  const contentType = blob.type || response.headers.get("content-type") || "";

  if (!contentType.startsWith("image/")) {
    throw new Error("Share-Route hat kein Bild zurückgegeben.");
  }

  await assertImageDecodable(blob);

  return blob;
}

export async function fetchShareImageFile(
  url: string,
  fileName: string,
  options: FetchShareImageFileOptions = {}
) {
  const minBytes = options.minBytes ?? DEFAULT_MIN_SHARE_IMAGE_BYTES;
  const retries = Math.max(0, options.retries ?? 2);
  const cacheBust = options.cacheBust ?? true;

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const fetchUrl = cacheBust ? withCacheBust(url) : getAbsoluteUrl(url);
      const blob = await fetchImageBlob(fetchUrl, minBytes);

      const contentType =
        blob.type && blob.type.startsWith("image/") ? blob.type : "image/png";

      const safeFileName = fileName.includes(".") ? fileName : `${fileName}.png`;

      return new File([blob], safeFileName, {
        type: contentType,
        lastModified: Date.now(),
      });
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        await wait(350 + attempt * 450);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Share-Bild konnte nicht vorbereitet werden.");
}

export async function fetchImageAsFile(url: string, fileName: string) {
  return fetchShareImageFile(url, fileName, {
    minBytes: DEFAULT_MIN_SHARE_IMAGE_BYTES,
    retries: 2,
    cacheBust: true,
  });
}

function downloadFile(file: File, fileName: string) {
  const url = URL.createObjectURL(file);

  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export async function shareImageFromUrl({
  imageUrl,
  fileName = "strikr-share.png",
  title = "SiegerCard",
  text = "SiegerCard aus strikr",
}: ShareImageFromUrlParams) {
  if (typeof window === "undefined") {
    throw new Error("Teilen ist hier nicht verfügbar.");
  }

  const absoluteUrl = getAbsoluteUrl(imageUrl);
  const file = await fetchShareImageFile(absoluteUrl, fileName);

  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    downloadFile(file, file.name || fileName);

    return {
      mode: "downloaded" as const,
    };
  }

  if (typeof navigator.canShare === "function") {
    const canShareFiles = navigator.canShare({
      files: [file],
    });

    if (!canShareFiles) {
      downloadFile(file, file.name || fileName);

      return {
        mode: "downloaded" as const,
      };
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
        : "Share Card konnte nicht geteilt werden."
    );
  }
}
