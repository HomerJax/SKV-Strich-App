import { FloodlightLayout } from "./layouts/FloodlightLayout";
import { StickerLayout } from "./layouts/StickerLayout";
import { ExtendedResultShareData } from "./result-share.types";

export default function ResultShareCard({
  data,
}: {
  data: ExtendedResultShareData;
}) {
  const useSticker = data.sessionId % 2 === 0;

  if (useSticker) {
    return <StickerLayout data={data} />;
  }

  return <FloodlightLayout data={data} />;
}