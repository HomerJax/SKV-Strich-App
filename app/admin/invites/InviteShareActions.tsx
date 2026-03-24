"use client";

import { useState } from "react";

type InviteShareActionsProps = {
  inviteUrl: string;
  clubRoleLabel: string;
};

export default function InviteShareActions({
  inviteUrl,
  clubRoleLabel,
}: InviteShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState("");

  const shareText = `Du wurdest zu einem Team bei strikr eingeladen (${clubRoleLabel}). Hier ist dein Einladungslink: ${inviteUrl}`;
  const mailSubject = "Deine Einladung zu strikr";
  const mailBody = `Hallo,\n\nhier ist dein Einladungslink zu strikr (${clubRoleLabel}):\n\n${inviteUrl}\n\nViele Grüße`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(
    mailSubject
  )}&body=${encodeURIComponent(mailBody)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setShareError("");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareError("Link konnte nicht in die Zwischenablage kopiert werden.");
    }
  }

  async function handleNativeShare() {
    try {
      setShareError("");

      if (!navigator.share) {
        setShareError(
          "Teilen wird auf diesem Gerät nicht direkt unterstützt. Nutze stattdessen Link kopieren."
        );
        return;
      }

      await navigator.share({
        title: "strikr Einladung",
        text: shareText,
        url: inviteUrl,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.name !== "AbortError"
      ) {
        setShareError("Teilen war nicht möglich. Nutze stattdessen Link kopieren.");
      }
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {copied ? "Link kopiert" : "Link kopieren"}
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Per WhatsApp teilen
        </a>

        <a
          href={mailUrl}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Per E-Mail teilen
        </a>

        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Teilen
        </button>
      </div>

      <div className="text-xs leading-5 text-slate-500">
        Für Instagram, Signal, Telegram oder andere Apps: einfach{" "}
        <span className="font-semibold text-slate-700">Link kopieren</span> oder{" "}
        <span className="font-semibold text-slate-700">Teilen</span> nutzen.
      </div>

      {shareError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {shareError}
        </div>
      ) : null}
    </div>
  );
}