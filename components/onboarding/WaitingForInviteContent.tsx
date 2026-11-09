"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function WaitingForInviteContent({ qaPreview = false }: { qaPreview?: boolean }) {
  const { t } = useI18n();
  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full rounded-[32px] border border-black/10 bg-white p-8 shadow-sm sm:p-10">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-slate-950 shadow-sm">
              <Image
                src="/icon-dark.png"
                alt="strikr Logo"
                width={42}
                height={42}
                className="h-10 w-10 object-contain"
                priority
              />
            </div>

            <div className="mt-5">
              <div className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                strikr
              </div>
              <div className="mt-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {t("waiting.title")}
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              {t("waiting.description")}
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-600">
              {t("waiting.hint")}
            </div>

            <div className="mt-8 flex flex-col gap-3">
              {qaPreview ? (
                <>
                  <button type="button" disabled className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white opacity-60">
                    {t("waiting.create")} · QA
                  </button>
                  <button type="button" disabled className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-500">
                    {t("waiting.loginLater")} · QA
                  </button>
                  <p className="text-xs font-bold text-cyan-800">Testvorschau: Navigation deaktiviert, kein Account oder Verein wird verändert.</p>
                </>
              ) : (
                <>
                  <Link href="/club-setup" className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                    {t("waiting.create")}
                  </Link>
                  <Link href="/login" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    {t("waiting.loginLater")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
