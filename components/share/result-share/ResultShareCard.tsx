import { FloodlightLayout } from "./layouts/FloodlightLayout";
import { PosterLayout } from "./layouts/PosterLayout";
import { StickerLayout } from "./layouts/StickerLayout";
import {
  ExtendedResultShareData,
  ResultShareLayout,
} from "./result-share.types";

function chooseLayout(data: ExtendedResultShareData): ResultShareLayout {
  const layouts: ResultShareLayout[] = ["poster", "sticker", "floodlight"];

  const seed = Math.abs(Number(data.sessionId) || 0);
  const mixed = (seed * 9301 + 49297) % 233280;
  const index = mixed % layouts.length;

  return layouts[index];
}

export default function ResultShareCard({
  data,
}: {
  data: ExtendedResultShareData;
}) {
  const layout = chooseLayout(data);

  if (layout === "poster") {
    return <PosterLayout data={data} />;
  }

  if (layout === "sticker") {
    return <StickerLayout data={data} />;
  }

  return <FloodlightLayout data={data} />;
}