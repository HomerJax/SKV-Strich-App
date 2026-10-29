import SeoFeaturePage, { getSeoFeatureMetadata } from "@/components/marketing/SeoFeaturePage";

export function generateMetadata() {
  return getSeoFeatureMetadata("standings", "de");
}

export default function Page() {
  return <SeoFeaturePage feature="standings" locale="de" />;
}
