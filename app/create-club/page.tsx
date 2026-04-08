import { redirect } from "next/navigation";
import CreateClubForm from "./CreateClubForm";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export default async function CreateClubPage() {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    redirect(AUTH_ROUTES.login);
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-5xl items-center justify-center px-4 py-10 sm:px-6">
      <CreateClubForm />
    </main>
  );
}