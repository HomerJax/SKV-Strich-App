export function formatDate(dateInput: string | Date) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function trimName(name: string, max = 18) {
  if (name.length <= max) {
    return name;
  }

  return `${name.slice(0, max - 1)}…`;
}

export function buildPlayerDisplayName(player: {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
}) {
  if (player.name && player.name.trim().length > 0) {
    return player.name.trim();
  }

  if (player.nickname && player.nickname.trim().length > 0) {
    return player.nickname.trim();
  }

  const fullName = [player.first_name, player.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName.length > 0) {
    return fullName;
  }

  return "Spieler";
}

/**
 * Externer Share:
 * - natives Share-Menü mit Bild
 * - Fallback: Download
 */
export async function shareImageFromUrl({
  imageUrl,
  fileName,
}: {
  imageUrl: string;
  fileName: string;
}) {
  try {
    const response = await fetch(imageUrl, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        errorText?.trim().length > 0
          ? errorText
          : `Share-Bild konnte nicht geladen werden (HTTP ${response.status}).`
      );
    }

    const blob = await response.blob();

    const safeFileName = fileName.toLowerCase().endsWith(".png")
      ? fileName
      : `${fileName}.png`;

    const file = new File([blob], safeFileName, {
      type: blob.type || "image/png",
      lastModified: Date.now(),
    });

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        files: [file],
      });
      return "shared";
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = safeFileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    return "downloaded";
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Teilen des Bildes fehlgeschlagen.");
  }
}