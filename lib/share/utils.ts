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

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

async function tryNativeShare(file: File, title: string) {
  try {
    const [{ Capacitor }, { Directory, Filesystem }, { Share }] = await Promise.all([
      import("@capacitor/core"),
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);

    if (!Capacitor.isNativePlatform()) return false;
    if (!Capacitor.isPluginAvailable("Share") || !Capacitor.isPluginAvailable("Filesystem")) {
      return false;
    }

    const data = await fileToBase64(file);
    const extension = file.type === "image/jpeg" ? "jpg" : "png";
    const path = `share/${Date.now()}-strikr-share.${extension}`;
    const written = await Filesystem.writeFile({
      path,
      data,
      directory: Directory.Cache,
      recursive: true,
    });

    await Share.share({
      title,
      files: [written.uri],
      dialogTitle: title,
    });

    return true;
  } catch {
    return false;
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
  const file = await fetchImageAsFile(absoluteUrl, fileName);

  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    if (await tryNativeShare(file, title)) {
      return { mode: "shared_file" as const };
    }

    throw new Error("Teilen wird auf diesem Gerät oder Browser nicht unterstützt.");
  }

  if (typeof navigator.canShare === "function") {
    const canShareFiles = navigator.canShare({ files: [file] });

    if (!canShareFiles) {
      if (await tryNativeShare(file, title)) {
        return { mode: "shared_file" as const };
      }

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

    if (await tryNativeShare(file, title)) {
      return { mode: "shared_file" as const };
    }

    throw new Error(
      error instanceof Error
        ? error.message
        : "SiegerCard konnte nicht geteilt werden."
    );
  }
}
