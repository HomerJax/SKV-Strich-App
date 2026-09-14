import { redirect } from "next/navigation";

type SearchParams = {
  email?: string | string[];
  next?: string | string[];
};

function getSingle(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const email = getSingle(resolvedSearchParams?.email).trim();
  const next = getSingle(resolvedSearchParams?.next).trim();
  const search = new URLSearchParams();

  if (email) search.set("email", email);
  if (next.startsWith("/") && !next.startsWith("//")) search.set("next", next);

  const query = search.toString();
  redirect(query ? `/login/forgot-password?${query}` : "/login/forgot-password");
}
