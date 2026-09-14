import { redirect } from "next/navigation";
import ResetPasswordForm from "./ResetPasswordForm";

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    code?: string;
    error?: string;
    next?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const resolvedSearchParams = await searchParams;
  const code = resolvedSearchParams?.code?.trim();
  const next = resolvedSearchParams?.next ?? "";

  if (code) {
    const resetPage = next
      ? `/login/reset-password?next=${encodeURIComponent(next)}`
      : "/login/reset-password";

    redirect(
      `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(resetPage)}`
    );
  }

  return (
    <ResetPasswordForm
      initialError={resolvedSearchParams?.error ?? ""}
      initialNext={next}
    />
  );
}
