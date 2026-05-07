import { SportsEditorialLayout } from "./layouts/SportsEditorialLayout";
import { ExtendedResultShareData } from "./result-share.types";

export default function ResultShareCard({
  data,
}: {
  data: ExtendedResultShareData;
}) {
  return <SportsEditorialLayout data={data} />;
}