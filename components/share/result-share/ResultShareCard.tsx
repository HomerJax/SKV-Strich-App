import { PosterLayout } from "./layouts/PosterLayout";
import { ExtendedResultShareData } from "./result-share.types";

export default function ResultShareCard({
  data,
}: {
  data: ExtendedResultShareData;
}) {
  return <PosterLayout data={data} />;
}