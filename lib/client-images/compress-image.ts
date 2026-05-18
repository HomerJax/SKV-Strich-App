export type CompressImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputType?: "image/jpeg" | "image/webp";
};

const DEFAULT_MAX_WIDTH = 1800;
const DEFAULT_MAX_HEIGHT = 1800;
const DEFAULT_QUALITY = 0.84;
const DEFAULT_OUTPUT_TYPE = "image/jpeg";

function canUseBrowserImageCompression() {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof Image !== "undefined" &&
    typeof URL !== "undefined" &&
    typeof File !== "undefined"
  );
}

function getSafeFileName(file: File, outputType: "image/jpeg" | "image/webp") {
  const rawName = file.name?.trim() || "winner-photo";
  const baseName = rawName.replace(/\.[^.]+$/, "") || "winner-photo";
  const extension = outputType === "image/webp" ? "webp" : "jpg";

  return `${baseName}.${extension}`;
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Bild konnte im Browser nicht geladen werden."));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  outputType: "image/jpeg" | "image/webp",
  quality: number
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Bild konnte im Browser nicht komprimiert werden."));
          return;
        }

        resolve(blob);
      },
      outputType,
      quality
    );
  });
}

export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {}
) {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  if (!canUseBrowserImageCompression()) {
    return file;
  }

  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
  const maxHeight = options.maxHeight ?? DEFAULT_MAX_HEIGHT;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const outputType = options.outputType ?? DEFAULT_OUTPUT_TYPE;

  try {
    const image = await loadImageFromFile(file);

    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;

    if (!sourceWidth || !sourceHeight) {
      return file;
    }

    const ratio = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
    const targetWidth = Math.max(1, Math.round(sourceWidth * ratio));
    const targetHeight = Math.max(1, Math.round(sourceHeight * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d", {
      alpha: false,
    });

    if (!context) {
      return file;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await canvasToBlob(canvas, outputType, quality);

    if (!blob.size || blob.size >= file.size) {
      return file;
    }

    return new File([blob], getSafeFileName(file, outputType), {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn("Client image compression failed, using original file:", error);
    return file;
  }
}
