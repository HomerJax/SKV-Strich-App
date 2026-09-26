"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

type InviteActionsProps = {
  inviteUrl: string;
};

export default function InviteActions({ inviteUrl }: InviteActionsProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
      alert(t("members.copyFailed"));
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    t("members.whatsappText", { url: inviteUrl }),
  )}`;

  const mailHref = `mailto:?subject=${encodeURIComponent(
    t("members.mailSubject"),
  )}&body=${encodeURIComponent(
    t("members.mailBody", { url: inviteUrl }),
  )}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {copied ? t("members.copied") : t("members.copyLink")}
        </button>

        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          WhatsApp
        </a>

        <a
          href={mailHref}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {t("members.email")}
        </a>
      </div>

      <p className="text-xs text-slate-500">
        {t("members.inviteLinkHint")}
      </p>
    </div>
  );
}