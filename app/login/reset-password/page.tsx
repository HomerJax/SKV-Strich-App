import ResetPasswordForm from "./ResetPasswordForm";

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <ResetPasswordForm
      initialError={resolvedSearchParams?.error ?? ""}
      initialNext={resolvedSearchParams?.next ?? ""}
    />
  );
}