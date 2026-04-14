import ForgotPasswordForm from "./ForgotPasswordForm";

type ForgotPasswordPageProps = {
  searchParams?: Promise<{
    email?: string;
    error?: string;
    success?: string;
    next?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <ForgotPasswordForm
      initialEmail={resolvedSearchParams?.email ?? ""}
      initialError={resolvedSearchParams?.error ?? ""}
      initialSuccess={resolvedSearchParams?.success ?? ""}
      initialNext={resolvedSearchParams?.next ?? ""}
    />
  );
}