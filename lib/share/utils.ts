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

export async function shareImageFromUrl({
  imageUrl,
  fileName,
  title,
  text,
}: {
  imageUrl: string;
  fileName: string;
  title: string;
  text?: string;
}) {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    throw new Error("Teilen wird auf diesem Gerät nicht unterstützt.");
  }

  const response = await fetch(imageUrl, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Share-Bild konnte nicht geladen werden.");
  }

  const blob = await response.blob();

  const safeFileName = fileName.toLowerCase().endsWith(".png")
    ? fileName
    : `${fileName}.png`;

  const file = new File([blob], safeFileName, {
    type: blob.type || "image/png",
    lastModified: Date.now(),
  });

  const shareDataWithFile: ShareData = {
    title,
    text,
    files: [file],
  };

  if (
    typeof navigator.canShare === "function" &&
    navigator.canShare(shareDataWithFile)
  ) {
    await navigator.share(shareDataWithFile);
    return "shared";
  }

  await navigator.share({
    title,
    text,
    url: imageUrl,
  });

  return "shared";
}
