export type ShareImageFromUrlParams = {
  imageUrl: string;
  fileName?: string;
  title?: string;
  text?: string;
};

function isIOS() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor || "";
  return /iPad|iPhone|iPod/.test(ua);
}

function openImageFallback(url: string) {
  if (typeof window === "undefined") return;

  const absoluteUrl = new URL(url, window.location.origin).toString();

  // iPhone / Safari ist oft zuverlässiger, wenn das Bild direkt geöffnet wird.
  // Dann kann der Nutzer sauber über den Browser teilen oder speichern.
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

  // 1) Best Case: echtes File-Sharing
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
      // absichtlich still -> wir fallen auf robustere Varianten zurück
    }
  }

  // 2) Fallback: URL teilen
  if (canUseNavigatorShare) {
    try {
      await navigator.share({
        title,
        text,
        url: absoluteUrl,
      });
      return;
    } catch {
      // absichtlich still -> nächster Fallback
    }
  }

  // 3) iPhone/Safari bzw. letzter robuster Fallback:
  // Bild direkt öffnen, damit der User es im Browser teilen/sichern kann.
  openImageFallback(absoluteUrl);

  // Falls das Popup geblockt wird, zusätzlich noch Clipboard versuchen.
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(absoluteUrl);
    }
  } catch {
    // kein weiterer Fehlerwurf nötig
  }

  // Für iOS lieber nicht als Fehler behandeln, wenn wir das Bild geöffnet haben.
  if (!isIOS()) {
    return;
  }
}