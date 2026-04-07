import LoginForm from "./LoginForm";

type LoginPageProps = {
  searchParams?: Promise<{
    email?: string;
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const email = resolvedSearchParams?.email ?? "";
  const error = resolvedSearchParams?.error ?? "";
  const next = resolvedSearchParams?.next ?? "";

  return (
    <LoginForm
      initialEmail={email}
      initialError={error}
      initialNext={next}
    />
  );
}