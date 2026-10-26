import SeoFeaturePage, { getSeoFeatureMetadata } from "@/components/marketing/SeoFeaturePage";

export function generateMetadata() {
  return getSeoFeatureMetadata("fair-teams", "en");
}

export default function Page() {
  return <SeoFeaturePage feature="fair-teams" locale="en" />;
}
