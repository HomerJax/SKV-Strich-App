import { FloodlightLayout } from "./layouts/FloodlightLayout";
import { StickerLayout } from "./layouts/StickerLayout";
import {
  ExtendedResultShareData,
  ResultShareLayout,
} from "./result-share.types";

function hashNumber(seed: number) {
  let hash = seed >>> 0;

  hash = (hash ^ 61) ^ (hash >>> 16);
  hash = hash + (hash << 3);
  hash = hash ^ (hash >>> 4);
  hash = Math.imul(hash, 0x27d4eb2d);
  hash = hash ^ (hash >>> 15);

  return hash >>> 0;
}

function chooseLayout(data: ExtendedResultShareData): ResultShareLayout {
  const layouts: ResultShareLayout[] = ["floodlight", "sticker"];
  const sessionSeed = Number.isFinite(data.sessionId) ? data.sessionId : 0;
  const index = hashNumber(sessionSeed) % layouts.length;

  return layouts[index];
}

export default function ResultShareCard({
  data,
}: {
  data: ExtendedResultShareData;
}) {
  const layout = chooseLayout(data);

  if (layout === "sticker") {
    return <StickerLayout data={data} />;
  }

  return <FloodlightLayout data={data} />;
}