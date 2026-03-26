import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";

type LoginPageProps = {
  searchParams?: Promise<{
      email?: string;
          error?: string;
            }>;
            };

            export default async function LoginPage({ searchParams }: LoginPageProps) {
              const resolvedSearchParams = await searchParams;
                const ctx = await getAuthContext();

                  if (ctx.user) {
                      if (!ctx.player) {
                            redirect(AUTH_ROUTES.onboarding);
                                }

                                    if (!ctx.memberships.length || !ctx.activeClubId) {
                                          redirect(AUTH_ROUTES.selectClub);
                                              }

                                                  redirect(AUTH_ROUTES.dashboard);
                                                    }

                                                      return (
                                                          <LoginForm
                                                                initialEmail={resolvedSearchParams?.email ?? ""}
                                                                      initialError={resolvedSearchParams?.error ?? ""}
                                                                          />
                                                                            );
                                                                            }