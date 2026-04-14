import { FloodlightLayout } from "./layouts/FloodlightLayout";
import { PosterLayout } from "./layouts/PosterLayout";
import { StickerLayout } from "./layouts/StickerLayout";
import {
  ExtendedResultShareData,
  ResultShareLayout,
} from "./result-share.types";

function hashString(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function chooseLayout(data: ExtendedResultShareData): ResultShareLayout {
  const seed = [
    data.clubName ?? data.branding.clubName ?? "club",
    data.date ?? "date",
    `${data.goalsA}:${data.goalsB}`,
  ].join("|");

  const layouts: ResultShareLayout[] = ["poster", "sticker", "floodlight"];
  return layouts[hashString(seed) % layouts.length];
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