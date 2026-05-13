import { fetchShareImageFile } from "@/lib/share/utils";

type ShareMvpResultOptions = {
  /**
   * Bleibt aus Kompatibilität mit bestehenden Call-Sites drin.
   * Wird bewusst nicht mehr für DOM/html-to-image genutzt.
   */
  element?: HTMLElement;
  imageUrl?: string;
  fileName?: string;
  title?: string;
  text?: string;
};

type PrepareMvpShareFileOptions = {
  imageUrl: string;
  fileName?: string;
};

type SharePreparedFileOptions = {
  file: File;
  fileName?: string;
  title?: string;
  text?: string;
};

function getAbsoluteUrl(url: string) {
  if (typeof window === "undefined") {
    return url;
  }

  return new URL(url, window.location.origin).toString();
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

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export async function prepareMvpShareFile({
  imageUrl,
  fileName = "strikr-mvp.png",
}: PrepareMvpShareFileOptions) {
  if (typeof window === "undefined") {
    throw new Error("MVP Share Card kann hier nicht vorbereitet werden.");
  }

  const absoluteUrl = getAbsoluteUrl(imageUrl);

  return fetchShareImageFile(absoluteUrl, fileName, {
    minBytes: 18_000,
    retries: 2,
    cacheBust: true,
  });
}

export async function preloadMvpShareImage(params: {
  imageUrl: string;
  fileName: string;
}) {
  /**
   * Preload ist nur Komfort, nie Voraussetzung.
   * Wichtig: Fehler hier dürfen keine unhandled Promise rejection erzeugen
   * und dürfen den Button nie blockieren.
   */
  try {
    await prepareMvpShareFile(params);
  } catch (error) {
    console.warn("MVP share preload skipped:", error);
  }
}

export async function sharePreparedFile({
  file,
  fileName = file.name || "strikr-share.png",
  title = "strikr",
  text = "Share Card erstellt mit strikr.",
}: SharePreparedFileOptions) {
  if (typeof window === "undefined") {
    throw new Error("Teilen ist hier nicht verfügbar.");
  }

  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    downloadFile(file, fileName);

    return {
      mode: "downloaded" as const,
    };
  }

  if (typeof navigator.canShare === "function") {
    const canShareFiles = navigator.canShare({
      files: [file],
    });

    if (!canShareFiles) {
      downloadFile(file, fileName);

      return {
        mode: "downloaded" as const,
      };
    }
  }

  try {
    await navigator.share({
      title,
      text,
      files: [file],
    });

    return {
      mode: "shared_file" as const,
    };
  } catch (error) {
    if (isAbortError(error)) {
      return {
        mode: "cancelled" as const,
      };
    }

    throw error;
  }
}

export async function shareMvpResult({
  imageUrl,
  fileName = "strikr-mvp.png",
  title = "strikr MVP",
  text = "MVP Card erstellt mit strikr.",
}: ShareMvpResultOptions) {
  if (!imageUrl) {
    throw new Error("MVP Share Card URL fehlt.");
  }

  const file = await prepareMvpShareFile({
    imageUrl,
    fileName,
  });

  return sharePreparedFile({
    file,
    fileName,
    title,
    text,
  });
}
