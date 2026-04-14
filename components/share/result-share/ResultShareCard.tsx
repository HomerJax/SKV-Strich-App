import { StickerLayout } from "./layouts/StickerLayout";
import { ExtendedResultShareData } from "./result-share.types";

export default function ResultShareCard({
  data,
}: {
  data: ExtendedResultShareData;
}) {
  return <StickerLayout data={data} />;
}