import SeoFeaturePage, { getSeoFeatureMetadata } from "@/components/marketing/SeoFeaturePage";

export function generateMetadata() {
  return getSeoFeatureMetadata("fair-teams", "de");
}

export default function Page() {
  return <SeoFeaturePage feature="fair-teams" locale="de" />;
}
