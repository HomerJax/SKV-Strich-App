import * as htmlToImage from "html-to-image";

type ShareMvpResultOptions = {
  element: HTMLElement;
  imageUrl?: string;
  fileName?: string;
  title?: string;
  text?: string;
};

type RestoreImage = () => void;

const dataUrlCache = new Map<string, string>();

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function waitForFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForFrames(count = 2) {
  for (let i = 0; i < count; i += 1) {
    await waitForFrame();
  }
}

async function waitForFonts() {
  if ("fonts" in document && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Font readiness is best effort.
    }
  }
}

async function waitForImage(img: HTMLImageElement) {
  const src = img.currentSrc || img.src;

  if (!src) return;

  if (img.complete && img.naturalWidth > 0) {
    if (typeof img.decode === "function") {
      try {
        await img.decode();
      } catch {
        // Some browsers reject decode even when image loaded.
      }
    }

    return;
  }

  await new Promise<void>((resolve) => {
    const done = () => resolve();

    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  });

  if (typeof img.decode === "function") {
    try {
      await img.decode();
    } catch {
      // Best effort.
    }
  }
}

function toAbsoluteUrl(src: string) {
  if (
    src.startsWith("data:") ||
    src.startsWith("blob:") ||
    src.startsWith("http://") ||
    src.startsWith("https://")
  ) {
    return src;
  }

  return new URL(src, window.location.origin).toString();
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Bild konnte nicht vorbereitet werden."));
    };

    reader.onerror = () => reject(new Error("Bild konnte nicht gelesen werden."));
    reader.readAsDataURL(blob);
  });
}

async function fetchImageAsDataUrl(src: string) {
  const absoluteSrc = toAbsoluteUrl(src);

  if (absoluteSrc.startsWith("data:")) {
    return absoluteSrc;
  }

  const cached = dataUrlCache.get(absoluteSrc);

  if (cached) {
    return cached;
  }

  const response = await fetch(absoluteSrc, {
    method: "GET",
    cache: "no-store",
    credentials: absoluteSrc.startsWith(window.location.origin)
      ? "include"
      : "omit",
  });

  if (!response.ok) {
    throw new Error(`Asset konnte nicht geladen werden (${response.status}).`);
  }

  const blob = await response.blob();

  if (!blob.type.startsWith("image/")) {
    throw new Error("Asset ist kein Bild.");
  }

  const dataUrl = await blobToDataUrl(blob);
  dataUrlCache.set(absoluteSrc, dataUrl);

  return dataUrl;
}

async function inlineImage(img: HTMLImageElement): Promise<RestoreImage> {
  const originalSrc = img.getAttribute("src");
  const originalSrcSet = img.getAttribute("srcset");
  const originalSizes = img.getAttribute("sizes");
  const src = img.currentSrc || img.src || originalSrc;

  if (!src || src.startsWith("data:")) {
    await waitForImage(img);
    return () => undefined;
  }

  await waitForImage(img);

  let dataUrl: string | null = null;

  try {
    dataUrl = await fetchImageAsDataUrl(src);
  } catch {
    // If fetch fails because of CORS, keep the original image but still wait.
    dataUrl = null;
  }

  if (!dataUrl) {
    await waitForImage(img);
    return () => undefined;
  }

  img.removeAttribute("srcset");
  img.removeAttribute("sizes");
  img.setAttribute("src", dataUrl);

  await waitForImage(img);
  await waitForFrames(2);

  return () => {
    if (originalSrcSet !== null) {
      img.setAttribute("srcset", originalSrcSet);
    } else {
      img.removeAttribute("srcset");
    }

    if (originalSizes !== null) {
      img.setAttribute("sizes", originalSizes);
    } else {
      img.removeAttribute("sizes");
    }

    if (originalSrc !== null) {
      img.setAttribute("src", originalSrc);
    } else {
      img.removeAttribute("src");
    }
  };
}

async function prepareShareElement(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll("img"));
  const restoreImages: RestoreImage[] = [];

  await waitForFonts();

  for (const img of images) {
    const restoreImage = await inlineImage(img);
    restoreImages.push(restoreImage);
  }

  await Promise.all(images.map((img) => waitForImage(img)));
  await waitForFonts();
  await waitForFrames(4);
  await wait(350);
  await waitForFrames(2);

  return restoreImages;
}

function loadBlobAsImage(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Share Card konnte nicht geprüft werden."));
    };

    img.src = objectUrl;
  });
}

async function assertUsableShareBlob(blob: Blob | null) {
  if (!blob) {
    throw new Error("MVP Share Card konnte nicht erstellt werden.");
  }

  if (blob.size < 40_000) {
    throw new Error("MVP Share Card wirkt unvollständig.");
  }

  const image = await loadBlobAsImage(blob);

  if (image.naturalWidth < 500 || image.naturalHeight < 500) {
    throw new Error("MVP Share Card ist beschädigt.");
  }

  return blob;
}

async function captureElement(element: HTMLElement) {
  const blob = await htmlToImage.toBlob(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#020617",
    width: 1080,
    height: 1920,
    style: {
      width: "1080px",
      height: "1920px",
    },
  });

  return assertUsableShareBlob(blob);
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

async function shareFile(params: {
  file: File;
  fileName: string;
  title: string;
  text: string;
}) {
  const { file, fileName, title, text } = params;

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    navigator.canShare?.({ files: [file] })
  ) {
    await navigator.share({
      title,
      text,
      files: [file],
    });

    return { mode: "shared_file" as const };
  }

  downloadFile(file, fileName);
  return { mode: "downloaded" as const };
}

export async function shareMvpResult({
  element,
  fileName = "strikr-mvp.png",
  title = "strikr MVP",
  text = "MVP Card erstellt mit strikr.",
}: ShareMvpResultOptions) {
  const restoreImages = await prepareShareElement(element);

  try {
    let blob: Blob | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await waitForFonts();
        await waitForFrames(3);
        blob = await captureElement(element);
        break;
      } catch (error) {
        lastError = error;
        await wait(500);
        await waitForFrames(4);
      }
    }

    if (!blob) {
      throw lastError instanceof Error
        ? lastError
        : new Error("MVP Share Card konnte nicht erstellt werden.");
    }

    const file = new File([blob], fileName, {
      type: "image/png",
      lastModified: Date.now(),
    });

    return shareFile({
      file,
      fileName,
      title,
      text,
    });
  } finally {
    restoreImages.forEach((restoreImage) => restoreImage());
  }
}

export async function preloadMvpShareImage(params: {
  imageUrl: string;
  fileName?: string;
}) {
  if (typeof window === "undefined") return;

  try {
    const absoluteUrl = new URL(params.imageUrl, window.location.origin).toString();

    const response = await fetch(absoluteUrl, {
      method: "GET",
      cache: "no-store",
      credentials: absoluteUrl.startsWith(window.location.origin)
        ? "include"
        : "omit",
    });

    if (!response.ok) return;

    const blob = await response.blob();

    if (!blob.type.startsWith("image/")) return;

    await loadBlobAsImage(blob);
  } catch {
    // Preload ist nur Warmup. Teilen darf daran nicht scheitern.
  }
}
