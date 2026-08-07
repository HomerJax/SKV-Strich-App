type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DetectionBox = {
  originX?: number;
  originY?: number;
  width?: number;
  height?: number;
};

type Detection = {
  boundingBox?: DetectionBox;
};

type DetectionResult = {
  detections?: Detection[];
};

type ObjectDetectorInstance = {
  detect: (image: HTMLImageElement) => DetectionResult;
  close?: () => void;
};

type VisionModule = {
  FilesetResolver: {
    forVisionTasks: (wasmRoot: string) => Promise<unknown>;
  };
  ObjectDetector: {
    createFromOptions: (
      vision: unknown,
      options: {
        baseOptions: { modelAssetPath: string };
        runningMode: "IMAGE";
        maxResults: number;
        scoreThreshold: number;
        categoryAllowlist: string[];
      }
    ) => Promise<ObjectDetectorInstance>;
  };
};

const MEDIAPIPE_VERSION = "0.10.22-rc.20250304";
const MEDIAPIPE_MODULE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/+esm`;
const MEDIAPIPE_WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const OBJECT_DETECTOR_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-tasks/object_detector/efficientdet_lite0_uint8.tflite";
const CROP_ASPECT = 4 / 5;

let detectorPromise: Promise<ObjectDetectorInstance> | null = null;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function getDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const moduleUrl = MEDIAPIPE_MODULE_URL;
      const visionModule = (await import(
        /* webpackIgnore: true */ moduleUrl
      )) as VisionModule;
      const vision = await visionModule.FilesetResolver.forVisionTasks(
        MEDIAPIPE_WASM_ROOT
      );

      return visionModule.ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: OBJECT_DETECTOR_MODEL_URL,
        },
        runningMode: "IMAGE",
        maxResults: 20,
        scoreThreshold: 0.28,
        categoryAllowlist: ["person"],
      });
    })().catch((error) => {
      detectorPromise = null;
      throw error;
    });
  }

  return detectorPromise;
}

function makeCropAroundPeople(
  imageWidth: number,
  imageHeight: number,
  boxes: Required<DetectionBox>[]
): CropRect | null {
  if (!boxes.length || !imageWidth || !imageHeight) return null;

  const left = Math.min(...boxes.map((box) => box.originX));
  const top = Math.min(...boxes.map((box) => box.originY));
  const right = Math.max(...boxes.map((box) => box.originX + box.width));
  const bottom = Math.max(...boxes.map((box) => box.originY + box.height));

  const peopleWidth = Math.max(1, right - left);
  const peopleHeight = Math.max(1, bottom - top);

  const paddedLeft = clamp(left - peopleWidth * 0.1, 0, imageWidth);
  const paddedRight = clamp(right + peopleWidth * 0.1, 0, imageWidth);
  const paddedTop = clamp(top - peopleHeight * 0.08, 0, imageHeight);
  const paddedBottom = clamp(bottom + peopleHeight * 0.08, 0, imageHeight);

  const focusWidth = Math.max(1, paddedRight - paddedLeft);
  const focusHeight = Math.max(1, paddedBottom - paddedTop);

  let cropWidth = focusWidth;
  let cropHeight = cropWidth / CROP_ASPECT;

  if (cropHeight < focusHeight) {
    cropHeight = focusHeight;
    cropWidth = cropHeight * CROP_ASPECT;
  }

  if (cropWidth > imageWidth) {
    cropWidth = imageWidth;
    cropHeight = cropWidth / CROP_ASPECT;
  }

  if (cropHeight > imageHeight) {
    cropHeight = imageHeight;
    cropWidth = cropHeight * CROP_ASPECT;
  }

  const focusCenterX = (paddedLeft + paddedRight) / 2;
  const focusCenterY = (paddedTop + paddedBottom) / 2;

  return {
    x: clamp(focusCenterX - cropWidth / 2, 0, imageWidth - cropWidth),
    y: clamp(focusCenterY - cropHeight / 2, 0, imageHeight - cropHeight),
    width: cropWidth,
    height: cropHeight,
  };
}

export async function detectSmartPersonCrop(
  image: HTMLImageElement
): Promise<{ crop: CropRect; personCount: number } | null> {
  try {
    const detector = await getDetector();
    const result = detector.detect(image);
    const boxes = (result.detections ?? [])
      .map((detection) => detection.boundingBox)
      .filter(
        (box): box is Required<DetectionBox> =>
          Boolean(
            box &&
              Number.isFinite(box.originX) &&
              Number.isFinite(box.originY) &&
              Number.isFinite(box.width) &&
              Number.isFinite(box.height) &&
              (box.width ?? 0) > 0 &&
              (box.height ?? 0) > 0
          )
      );

    const crop = makeCropAroundPeople(
      image.naturalWidth,
      image.naturalHeight,
      boxes
    );

    return crop ? { crop, personCount: boxes.length } : null;
  } catch (error) {
    console.warn("Smart winner photo crop unavailable", error);
    return null;
  }
}
