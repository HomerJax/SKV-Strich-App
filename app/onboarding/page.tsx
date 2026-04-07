import OnboardingForm from "./OnboardingForm";

type OnboardingPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const resolvedSearchParams = await searchParams;
  const next = resolvedSearchParams?.next ?? "";

  return <OnboardingForm initialNext={next} />;
}