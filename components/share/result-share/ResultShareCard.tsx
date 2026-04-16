import { FloodlightLayout } from "./layouts/FloodlightLayout";
import { ExtendedResultShareData } from "./result-share.types";

export default function ResultShareCard({
  data,
}: {
  data: ExtendedResultShareData;
}) {
  return <FloodlightLayout data={data} />;
}