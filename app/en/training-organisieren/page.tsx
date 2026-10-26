import SeoFeaturePage, { getSeoFeatureMetadata } from "@/components/marketing/SeoFeaturePage";

export function generateMetadata() {
  return getSeoFeatureMetadata("training", "en");
}

export default function Page() {
  return <SeoFeaturePage feature="training" locale="en" />;
}
