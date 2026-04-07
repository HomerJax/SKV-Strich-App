import SignupForm from "./SignupForm";

type SignupPageProps = {
  searchParams?: Promise<{
    email?: string;
    error?: string;
    next?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const resolvedSearchParams = await searchParams;
  const email = resolvedSearchParams?.email ?? "";
  const error = resolvedSearchParams?.error ?? "";
  const next = resolvedSearchParams?.next ?? "";

  return (
    <SignupForm
      initialEmail={email}
      initialError={error}
      initialNext={next}
    />
  );
}