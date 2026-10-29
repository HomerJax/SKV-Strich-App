import SeoFeaturePage, { getSeoFeatureMetadata } from "@/components/marketing/SeoFeaturePage";

export function generateMetadata() {
  return getSeoFeatureMetadata("hobby-teams", "de");
}

export default function Page() {
  return <SeoFeaturePage feature="hobby-teams" locale="de" />;
}
