"use client";

import { useState } from "react";

type ClubSetupInviteActionsProps = {
  inviteUrl: string;
  clubName: string;
};

export default function ClubSetupInviteActions({
  inviteUrl,
  clubName,
}: ClubSetupInviteActionsProps) {
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
      setShareError("Link konnte nicht kopiert werden.");
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
        title: `${clubName} auf strikr`,
        text: `Komm in unser Team auf strikr: ${clubName}`,
        url: inviteUrl,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setShareError("Teilen konnte nicht gestartet werden.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-black/10 bg-white p-3">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          Einladungslink
        </div>

        <div className="mt-2 rounded-xl border border-black/10 bg-[#f7f8fb] px-3 py-2 text-sm text-neutral-700">
          <div className="truncate">{inviteUrl}</div>
        </div>

        <p className="mt-2 text-xs leading-5 text-neutral-500">
          Der Link ist bewusst mehrfach nutzbar und kann direkt in eure
          Mannschaftsgruppe geschickt werden.
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
          {copied ? "Kopiert" : "Link kopieren"}
        </button>

        <button
          type="button"
          onClick={shareInviteLink}
          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50"
        >
          Teilen
        </button>
      </div>
    </div>
  );
}