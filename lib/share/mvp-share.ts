import * as htmlToImage from "html-to-image";

type ShareMvpResultOptions = {
  element: HTMLElement;
  fileName?: string;
  title?: string;
  text?: string;
};

export async function shareMvpResult({
  element,
  fileName = "strikr-mvp.png",
  title = "strikr MVP",
  text = "MVP Card erstellt mit strikr.",
}: ShareMvpResultOptions) {
  const blob = await htmlToImage.toBlob(element, {
    cacheBust: true,
    pixelRatio: 1,
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