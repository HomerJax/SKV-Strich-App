import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export async function requirePowerUser() {
  const ctx = await getAuthContext();

  if (!ctx.user || !ctx.isPowerUser) {
    redirect(AUTH_ROUTES.dashboard);
  }

  return ctx;
}