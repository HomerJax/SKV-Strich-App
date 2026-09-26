"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";

type HeaderAuthControlsProps = {
  isLoggedIn: boolean;
};

function getCurrentNext(pathname: string, searchParams: URLSearchParams | null) {
  const query = searchParams?.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function HeaderAuthControls({
  isLoggedIn,
}: HeaderAuthControlsProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const next = useMemo(
    () => getCurrentNext(pathname || "/", searchParams),
    [pathname, searchParams]
  );

  if (isLoggedIn) {
    return (
      <form method="post" action="/api/logout">
        <button
          type="submit"
          className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm transition hover:bg-neutral-100"
        >
          {t("headerAuth.logout")}
        </button>
      </form>
    );
  }

  return (
    <div className="relative">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm transition hover:bg-neutral-100"
        >
          {t("headerAuth.login")}
        </button>
      ) : (
        <div className="w-[min(320px,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-neutral-900">{t("headerAuth.login")}</div>
              <div className="text-xs text-neutral-500">
                {t("headerAuth.description")}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
              aria-label={t("headerAuth.close")}
            >
              ✕
            </button>
          </div>

          <form method="post" action="/api/login" className="space-y-3">
            <input type="hidden" name="next" value={next} />

            <div>
              <label
                htmlFor="header-login-email"
                className="mb-1 block text-xs font-medium text-neutral-700"
              >
                {t("headerAuth.email")}
              </label>
              <input
                id="header-login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900"
                placeholder={t("headerAuth.emailPlaceholder")}
              />
            </div>

            <div>
              <label
                htmlFor="header-login-password"
                className="mb-1 block text-xs font-medium text-neutral-700"
              >
                {t("headerAuth.password")}
              </label>
              <input
                id="header-login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-neutral-900"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              {t("headerAuth.submit")}
            </button>
          </form>

          <div className="mt-3 flex items-center justify-between text-xs">
            <Link
              href={`/login/forgot-password?next=${encodeURIComponent(next)}`}
              className="text-neutral-600 underline hover:text-neutral-900"
            >
              {t("headerAuth.forgotPassword")}
            </Link>

            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="font-medium text-neutral-900 underline"
            >
              {t("headerAuth.register")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
