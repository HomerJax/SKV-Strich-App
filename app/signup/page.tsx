import SignupForm from "./SignupForm";

type SignupPageProps = {
  searchParams?: Promise<{
    email?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const resolvedSearchParams = await searchParams;
  const email = resolvedSearchParams?.email ?? "";

  return <SignupForm initialEmail={email} />;
}