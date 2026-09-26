"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

type InviteShareActionsProps = {
  inviteUrl: string;
  clubRoleLabel: string;
};

export default function InviteShareActions({
  inviteUrl,
  clubRoleLabel,
}: InviteShareActionsProps) {
  const { t } = useI18n();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [shareError, setShareError] = useState("");

  const shareText = useMemo(
    () => t("inviteShare.text", { role: clubRoleLabel, url: inviteUrl }),
    [clubRoleLabel, inviteUrl, t],
  );

  const mailSubject = t("inviteShare.mailSubject");
  const mailBody = shareText;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(
    mailSubject
  )}&body=${encodeURIComponent(mailBody)}`;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setShareError("");
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setShareError(t("inviteShare.copyLinkFailed"));
    }
  }

  async function handleCopyMessage() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedMessage(true);
      setShareError("");
      window.setTimeout(() => setCopiedMessage(false), 2000);
    } catch {
      setShareError(t("inviteShare.copyMessageFailed"));
    }
  }

  async function handleNativeShare() {
    try {
      setShareError("");

      if (!navigator.share) {
        setShareError(t("inviteShare.unsupported"));
        return;
      }

      await navigator.share({
        title: t("inviteShare.nativeTitle"),
        text: shareText,
        url: inviteUrl,
      });
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        setShareError(t("inviteShare.shareFailed"));
      }
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">
          {t("inviteShare.label")}
        </label>
        <textarea
          readOnly
          value={shareText}
          rows={14}
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900"
        />
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {t("inviteShare.hint")}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {copiedLink ? t("inviteShare.linkCopied") : t("inviteShare.copyLink")}
        </button>

        <button
          type="button"
          onClick={handleCopyMessage}
          className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {copiedMessage ? t("inviteShare.messageCopied") : t("inviteShare.copyMessage")}
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {t("inviteShare.whatsapp")}
        </a>

        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {t("inviteShare.share")}
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-1 lg:grid-cols-1">
        <a
          href={mailUrl}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {t("inviteShare.email")}
        </a>
      </div>

      {shareError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {shareError}
        </div>
      ) : null}
    </div>
  );
}