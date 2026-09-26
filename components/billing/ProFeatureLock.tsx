"use client";

import { isFreeLaunchEnabled } from "@/lib/env";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { MessageKey } from "@/lib/i18n/messages";

type ProFeatureLockProps = {
  clubName?: string | null;
  title?: string;
  description?: string;
  featureList?: string[];
  compact?: boolean;
};

/**
 * Aktuell bewusst pragmatisch gesetzt, damit strikr vor dem Supercup
 * manuell verkaufbar ist.
 *
 * Später umstellen auf:
 * - hello@strikr.team
 * - offizielle strikr WhatsApp-/Business-Nummer
 */
const STRIKR_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_STRIKR_CONTACT_EMAIL?.trim() || "mb1607@gmx.de";

const STRIKR_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_STRIKR_WHATSAPP_NUMBER?.replace(/[^\d]/g, "") ||
  "491772685717";

function buildContactMessage(clubName: string | null | undefined, t: (key: MessageKey, params?: Record<string, string | number | null | undefined>) => string) {
  const teamName = clubName?.trim() || t("pro.teamFallback");

  return [
    t("pro.contactIntro"),
    "",
    t("pro.contactTeam", { name: teamName }),
    "",
    t("pro.contactOffer"),
  ].join("\n");
}

function buildWhatsAppHref(clubName: string | null | undefined, t: (key: MessageKey, params?: Record<string, string | number | null | undefined>) => string) {
  const text = buildContactMessage(clubName, t);

  return `https://wa.me/${STRIKR_WHATSAPP_NUMBER}?text=${encodeURIComponent(
    text
  )}`;
}

function buildMailHref(clubName: string | null | undefined, t: (key: MessageKey, params?: Record<string, string | number | null | undefined>) => string) {
  return `mailto:${STRIKR_CONTACT_EMAIL}?subject=${encodeURIComponent(
    t("pro.mailSubject")
  )}&body=${encodeURIComponent(buildContactMessage(clubName, t))}`;
}

export default function ProFeatureLock({
  clubName,
  title,
  description,
  featureList = [],
  compact = false,
}: ProFeatureLockProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("pro.defaultTitle");
  const resolvedDescription = description ?? t("pro.defaultDescription");

  if (isFreeLaunchEnabled()) {
    return (
      <div
        className={`rounded-[24px] border border-sky-200 bg-sky-50 shadow-sm ${
          compact ? "p-4" : "p-5"
        }`}
      >
        <div className="inline-flex rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-bold text-sky-800">
          {t("pro.launchBadge")}
        </div>

        <h3 className="mt-3 text-lg font-extrabold tracking-tight text-slate-950">
          {t("pro.launchTitle")}
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-700">
          {t("pro.launchDescription")}
        </p>
      </div>
    );
  }

  const whatsappHref = buildWhatsAppHref(clubName, t);
  const mailHref = buildMailHref(clubName, t);

  return (
    <div
      className={`rounded-[24px] border border-slate-200 bg-white shadow-sm ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
        strikr Pro
      </div>

      <h3 className="mt-3 text-lg font-extrabold tracking-tight text-slate-950">
        {resolvedTitle}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">{resolvedDescription}</p>

      {featureList.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {featureList.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white">
                ✓
              </span>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          {t("pro.whatsappCta")}
        </a>

        <a
          href={mailHref}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
        >
          {t("pro.emailCta")}
        </a>
      </div>

      <p className="mt-3 text-center text-xs font-medium text-slate-400">
        {t("pro.manualNote")}
      </p>
    </div>
  );
}
