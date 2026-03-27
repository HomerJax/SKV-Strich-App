"use client";

import { useMemo, useState } from "react";

type InviteShareActionsProps = {
  inviteUrl: string;
  clubRoleLabel: string;
};

export default function InviteShareActions({
  inviteUrl,
  clubRoleLabel,
}: InviteShareActionsProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [shareError, setShareError] = useState("");

  const shareText = useMemo(() => {
    return `Hey 👋

du wurdest zu Strikr eingeladen (${clubRoleLabel}) ⚽

👉 So startest du:
1. Einladung annehmen / Link öffnen
2. Registrieren
3. Fertig 👍

👉 Was du direkt machen kannst:
• Trainings sehen & teilnehmen
• Teams einsehen
• Ergebnisse & Stats checken 📊
• Siegerfotos anschauen 📸

👉 Wichtig:
Jeder kann Trainings anlegen und Teams erstellen –
falls mal jemand fehlt oder spontan organisiert werden muss 👍

Die App ist aktuell noch in der Pilotphase –
wenn dir etwas auffällt (gut oder schlecht), gerne Bescheid sagen 🙌

Hier geht’s los:
${inviteUrl}`;
  }, [clubRoleLabel, inviteUrl]);

  const mailSubject = "Deine Einladung zu Strikr";
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
      setShareError("Link konnte nicht in die Zwischenablage kopiert werden.");
    }
  }

  async function handleCopyMessage() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedMessage(true);
      setShareError("");
      window.setTimeout(() => setCopiedMessage(false), 2000);
    } catch {
      setShareError(
        "Nachricht konnte nicht in die Zwischenablage kopiert werden."
      );
    }
  }

  async function handleNativeShare() {
    try {
      setShareError("");

      if (!navigator.share) {
        setShareError(
          "Teilen wird auf diesem Gerät nicht direkt unterstützt. Nutze stattdessen Nachricht kopieren."
        );
        return;
      }

      await navigator.share({
        title: "Strikr Einladung",
        text: shareText,
        url: inviteUrl,
      });
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        setShareError(
          "Teilen war nicht möglich. Nutze stattdessen Nachricht kopieren."
        );
      }
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">
          Nachricht zum Teilen
        </label>
        <textarea
          readOnly
          value={shareText}
          rows={14}
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900"
        />
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Du kannst diese Nachricht direkt kopieren oder per WhatsApp, E-Mail
          oder Teilen-Funktion verschicken.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {copiedLink ? "Link kopiert" : "Link kopieren"}
        </button>

        <button
          type="button"
          onClick={handleCopyMessage}
          className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {copiedMessage ? "Nachricht kopiert" : "Nachricht kopieren"}
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Per WhatsApp teilen
        </a>

        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Teilen
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-1 lg:grid-cols-1">
        <a
          href={mailUrl}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Per E-Mail teilen
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