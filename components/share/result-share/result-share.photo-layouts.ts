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
    // The winner photo is stored as a non-destructive master image.
    // This layout keeps the visual focus high so faces stay clear of the footer
    // and close to the start of the photo area below the editorial header.
    focusX: 0.5,
    focusY: 0.18,
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
