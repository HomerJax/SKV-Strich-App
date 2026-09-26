"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useI18n } from "@/components/i18n/I18nProvider";

/**
 * Safety net for Supabase recovery emails.
 *
 * If Auth falls back to the configured Site URL, the recovery session is
 * delivered in the URL fragment. Fragments never reach the Next.js server, so
 * the landing page would otherwise render normally. Detect that recovery
 * payload in the browser, persist the session into the SSR cookies and forward
 * to the password form.
 */
export default function RecoveryLandingRedirect() {
  const { t } = useI18n();
  const resetError = t("auth.resetInvalid");
  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash);
    if (params.get("type") !== "recovery") return;

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      window.location.replace(
        "/login/forgot-password?error=" +
          encodeURIComponent(
            resetError
          )
      );
      return;
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    void supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          window.location.replace(
            "/login/forgot-password?error=" +
              encodeURIComponent(
                resetError
              )
          );
          return;
        }

        window.history.replaceState(null, "", "/login/reset-password");
        window.location.replace("/login/reset-password");
      });
  }, [resetError]);

  return null;
}
