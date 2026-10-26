import SeoFeaturePage, { getSeoFeatureMetadata } from "@/components/marketing/SeoFeaturePage";

export function generateMetadata() {
  return getSeoFeatureMetadata("training", "de");
}

export default function Page() {
  return <SeoFeaturePage feature="training" locale="de" />;
}
