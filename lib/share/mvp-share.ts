import * as htmlToImage from "html-to-image";

type ShareMvpResultOptions = {
  element: HTMLElement;
  fileName?: string;
  title?: string;
  text?: string;
};

function waitForTwoFrames() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

async function waitForImage(img: HTMLImageElement) {
  const src = img.currentSrc || img.src;

  if (!src) {
    return;
  }

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

async function prepareShareElement(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(images.map((img) => waitForImage(img)));
  await waitForTwoFrames();
}

export async function shareMvpResult({
  element,
  fileName = "strikr-mvp.png",
  title = "strikr MVP",
  text = "MVP Card erstellt mit strikr.",
}: ShareMvpResultOptions) {
  await prepareShareElement(element);

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