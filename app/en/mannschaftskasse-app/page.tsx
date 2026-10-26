import SeoFeaturePage, { getSeoFeatureMetadata } from "@/components/marketing/SeoFeaturePage";

export function generateMetadata() {
  return getSeoFeatureMetadata("team-fund", "en");
}

export default function Page() {
  return <SeoFeaturePage feature="team-fund" locale="en" />;
}
