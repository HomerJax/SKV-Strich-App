'use client';

import { useState } from 'react';

type InviteActionsProps = {
  inviteUrl: string;
};

export default function InviteActions({ inviteUrl }: InviteActionsProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Link konnte nicht kopiert werden.');
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `Hier ist dein strikr Einladungslink:\n\n${inviteUrl}`
  )}`;

  const mailHref = `mailto:?subject=${encodeURIComponent(
    'Dein strikr Einladungslink'
  )}&body=${encodeURIComponent(
    `Hi,\n\nhier ist dein Einladungslink für strikr:\n\n${inviteUrl}\n\nViele Grüße`
  )}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        {copied ? 'Kopiert' : 'Link kopieren'}
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
        E-Mail
      </a>
    </div>
  );
}