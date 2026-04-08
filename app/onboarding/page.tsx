import OnboardingForm from "./OnboardingForm";

type OnboardingPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

function isInviteJoinNext(next: string) {
  return next.startsWith("/join?token=");
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const resolvedSearchParams = await searchParams;
  const next = resolvedSearchParams?.next ?? "";
  const inviteFlow = isInviteJoinNext(next);

  return <OnboardingForm initialNext={next} inviteFlow={inviteFlow} />;
}