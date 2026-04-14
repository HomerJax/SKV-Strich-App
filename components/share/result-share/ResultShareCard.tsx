import { FloodlightLayout } from "./layouts/FloodlightLayout";
import { StickerLayout } from "./layouts/StickerLayout";
import { ExtendedResultShareData } from "./result-share.types";

function hashNumber(seed: number) {
  let hash = seed >>> 0;

  hash = (hash ^ 61) ^ (hash >>> 16);
  hash = hash + (hash << 3);
  hash = hash ^ (hash >>> 4);
  hash = Math.imul(hash, 0x27d4eb2d);
  hash = hash ^ (hash >>> 15);

  return hash >>> 0;
}

export default function ResultShareCard({
  data,
}: {
  data: ExtendedResultShareData;
}) {
  const layouts = ["floodlight", "sticker"] as const;

  const index = hashNumber(data.sessionId) % layouts.length;
  const layout = layouts[index];

  if (layout === "sticker") {
    return <StickerLayout data={data} />;
  }

  return <FloodlightLayout data={data} />;
}