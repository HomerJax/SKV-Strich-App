import * as htmlToImage from "html-to-image";

type ShareMvpResultOptions = {
  element?: HTMLElement;
  imageUrl?: string;
  fileName?: string;
  title?: string;
  text?: string;
};

type RestoreImage = () => void;

const dataUrlCache = new Map<string, string>();

function waitForTwoFrames() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

async function waitForImage(img: HTMLImageElement) {
  const src = img.currentSrc || img.src;

  if (!src) return;

  if (img.complete && img.naturalWidth > 0) {
    if (typeof img.decode === "function") {
      try {
        await img.decode();
      } catch {
        // bewusst still
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
      // bewusst still
    }
  }
}

function toAbsoluteImageUrl(src: string) {
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

    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Bild konnte nicht als Data-URL gelesen werden."));
    };

    reader.onerror = () => {
      reject(new Error("Bild konnte nicht gelesen werden."));
    };

    reader.readAsDataURL(blob);
  });
}

async function fetchImageAsDataUrl(src: string) {
  const absoluteSrc = toAbsoluteImageUrl(src);

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
  });

  if (!response.ok) {
    throw new Error(`Bild konnte nicht geladen werden: ${absoluteSrc}`);
  }

  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);

  dataUrlCache.set(absoluteSrc, dataUrl);

  return dataUrl;
}

async function inlineImageForCapture(
  img: HTMLImageElement
): Promise<RestoreImage> {
  const originalSrc = img.getAttribute("src");
  const originalSrcSet = img.getAttribute("srcset");
  const originalSizes = img.getAttribute("sizes");
  const sourceSrc = img.currentSrc || img.src || originalSrc;

  if (!sourceSrc || sourceSrc.startsWith("data:")) {
    return () => undefined;
  }

  await waitForImage(img);

  const dataUrl = await fetchImageAsDataUrl(sourceSrc);

  img.removeAttribute("srcset");
  img.removeAttribute("sizes");
  img.setAttribute("src", dataUrl);

  await waitForImage(img);

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

  for (const img of images) {
    const restoreImage = await inlineImageForCapture(img);
    restoreImages.push(restoreImage);
  }

  await waitForTwoFrames();

  return restoreImages;
}

async function fetchShareImageFile(imageUrl: string, fileName: string) {
  const absoluteUrl = toAbsoluteImageUrl(imageUrl);

  const response = await fetch(absoluteUrl, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Share-Bild konnte nicht geladen werden: ${absoluteUrl}`);
  }

  const blob = await response.blob();

  return new File([blob], fileName, {
    type: blob.type || "image/png",
  });
}

async function shareFile(params: {
  file: File;
  fileName: string;
  title: string;
  text: string;
}) {
  const { file, fileName, title, text } = params;

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title,
      text,
      files: [file],
    });

    return;
  }

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

async function shareFromElement(params: {
  element: HTMLElement;
  fileName: string;
  title: string;
  text: string;
}) {
  const { element, fileName, title, text } = params;
  const restoreImages = await prepareShareElement(element);

  try {
    const blob = await htmlToImage.toBlob(element, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#020617",
      width: 1080,
      height: 1920,
    });

    if (!blob) {
      throw new Error("MVP Share Card konnte nicht erstellt werden.");
    }

    const file = new File([blob], fileName, {
      type: "image/png",
    });

    await shareFile({
      file,
      fileName,
      title,
      text,
    });
  } finally {
    restoreImages.forEach((restoreImage) => restoreImage());
  }
}

export async function shareMvpResult({
  element,
  imageUrl,
  fileName = "strikr-mvp.png",
  title = "strikr MVP",
  text = "MVP Card erstellt mit strikr.",
}: ShareMvpResultOptions) {
  if (imageUrl) {
    try {
      const file = await fetchShareImageFile(imageUrl, fileName);

      await shareFile({
        file,
        fileName,
        title,
        text,
      });

      return;
    } catch (error) {
      console.warn("Server MVP share image failed, falling back to DOM capture:", error);

      if (!element) {
        throw error;
      }
    }
  }

  if (!element) {
    throw new Error("MVP Share Card ist noch nicht bereit.");
  }

  await shareFromElement({
    element,
    fileName,
    title,
    text,
  });
}
