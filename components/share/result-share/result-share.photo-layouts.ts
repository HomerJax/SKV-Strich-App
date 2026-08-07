export type ResultSharePhotoLayoutId = "sports_editorial";

type SafeZone = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type ResultSharePhotoLayout = {
  focusX: number;
  focusY: number;
  safeZone: SafeZone;
};

const PHOTO_LAYOUTS: Record<ResultSharePhotoLayoutId, ResultSharePhotoLayout> = {
  sports_editorial: {
    // Keep faces / upper bodies higher in the visible photo area.
    // The current card uses a wide photo window, so a centered 4:5 master
    // would otherwise lose too much of the upper part of the image.
    focusX: 0.5,
    focusY: 0.34,
    safeZone: {
      top: 0.08,
      right: 0.05,
      bottom: 0.2,
      left: 0.05,
    },
  },
};

export function getResultSharePhotoLayout(
  layoutId: ResultSharePhotoLayoutId
): ResultSharePhotoLayout {
  return PHOTO_LAYOUTS[layoutId];
}

export function getPhotoObjectPosition(layout: ResultSharePhotoLayout) {
  return `${Math.round(layout.focusX * 100)}% ${Math.round(layout.focusY * 100)}%`;
}
