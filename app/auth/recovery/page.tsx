"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import ResetPasswordForm from "@/app/login/reset-password/ResetPasswordForm";
import { useI18n } from "@/components/i18n/I18nProvider";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "";
  return value;
}

export default function RecoveryPage() {
  const { t } = useI18n();
  const errorUrl = "/login/forgot-password?error=" + encodeURIComponent(t("auth.resetInvalid"));
  const [ready, setReady] = useState(false);
  const [next, setNext] = useState("");

  useEffect(() => {
    const run = async () => {
      const query = new URLSearchParams(window.location.search);
      const safeNextValue = safeNext(query.get("next"));
      const hash = new URLSearchParams(
        window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash
      );

      const errorDescription =
        hash.get("error_description") || query.get("error_description");
      if (errorDescription) {
        window.location.replace(errorUrl);
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (!accessToken || !refreshToken || hash.get("type") !== "recovery") {
        window.location.replace(errorUrl);
        return;
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        window.location.replace(errorUrl);
        return;
      }

      // Recovery is intentionally completed on this public route. Do not
      // navigate to another page after setSession: native/browser entry logic
      // may treat the temporary recovery session as a normal login and send the
      // user to /home before a new password was chosen.
      window.history.replaceState(null, "", "/auth/recovery");
      setNext(safeNextValue);
      setReady(true);
    };

    void run();
  }, [errorUrl]);

  if (ready) {
    return <ResetPasswordForm initialNext={next} />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-black">
      <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 text-center shadow-sm">
        <div className="text-2xl font-black">strikr</div>
        <p className="mt-4 text-sm font-semibold text-zinc-600">
          {t("auth.resetChecking")}
        </p>
      </div>
    </main>
  );
}
