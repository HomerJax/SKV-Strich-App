"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

type ClubSetupInviteActionsProps = {
  inviteUrl: string;
  clubName: string;
};

export default function ClubSetupInviteActions({
  inviteUrl,
  clubName,
}: ClubSetupInviteActionsProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState("");

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setShareError("");

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setShareError(t("invite.copyError"));
    }
  }

  async function shareInviteLink() {
    try {
      setShareError("");

      if (!navigator.share) {
        await copyInviteLink();
        return;
      }

      await navigator.share({
        title: t("invite.title", { club: clubName }),
        text: t("invite.shareText", { club: clubName }),
        url: inviteUrl,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setShareError(t("invite.shareError"));
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-black/10 bg-white p-3">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          {t("invite.link")}
        </div>

        <div className="mt-2 rounded-xl border border-black/10 bg-[#f7f8fb] px-3 py-2 text-sm text-neutral-700">
          <div className="truncate">{inviteUrl}</div>
        </div>

        <p className="mt-2 text-xs leading-5 text-neutral-500">
          {t("invite.multiUse")}
        </p>
      </div>

      {shareError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {shareError}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={copyInviteLink}
          className="inline-flex items-center justify-center rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          {copied ? t("invite.copied") : t("invite.copy")}
        </button>

        <button
          type="button"
          onClick={shareInviteLink}
          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50"
        >
          {t("invite.share")}
        </button>
      </div>
    </div>
  );
}