import Link from "next/link";
import { getServerI18n } from "@/lib/i18n/server";

export default async function SupportPage() {
  const { t } = await getServerI18n();
  const supportMail = `mailto:mb1607@gmx.de?subject=${encodeURIComponent(t("support.mailSubject"))}`;

  return (
    <main className="min-h-screen bg-neutral-100 text-slate-950">
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
        >
          {t("support.back")}
        </Link>

        <div className="mt-5 rounded-[28px] border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            {t("support.eyebrow")}
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-tight">
            {t("support.title")}
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            {t("support.intro")}
          </p>

          <a
            href={supportMail}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            {t("support.emailCta")}
          </a>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="font-extrabold text-slate-950">
                {t("support.techTitle")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t("support.techText")}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="font-extrabold text-slate-950">
                {t("support.privacyTitle")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t("support.privacyText")}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-7 text-blue-950">
            <h2 className="font-extrabold">{t("support.deleteTitle")}</h2>
            <p className="mt-2">
              {t("support.deleteText")}
            </p>
            <Link
              href="/account-loeschen"
              className="mt-3 inline-flex font-bold underline underline-offset-4"
            >
              {t("support.deleteGuide")}
            </Link>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-5 text-sm text-slate-600">
            <p>
              {t("support.contact", { name: "Marcus Bofinger" })}{" "}
              <a
                href="mailto:mb1607@gmx.de"
                className="font-semibold text-slate-950 underline underline-offset-4"
              >
                mb1607@gmx.de
              </a>
            </p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              <Link
                href="/datenschutz"
                className="font-semibold text-slate-950 underline underline-offset-4"
              >
                {t("support.privacy")}
              </Link>
              <Link
                href="/impressum"
                className="font-semibold text-slate-950 underline underline-offset-4"
              >
                {t("support.imprint")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
