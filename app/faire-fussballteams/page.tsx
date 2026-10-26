import SeoFeaturePage, { getSeoFeatureMetadata } from "@/components/marketing/SeoFeaturePage";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { locale } = await getServerI18n();
  return getSeoFeatureMetadata("fair-teams", locale);
}

export default async function Page() {
  const { locale } = await getServerI18n();
  return <SeoFeaturePage feature="fair-teams" locale={locale} />;
}
