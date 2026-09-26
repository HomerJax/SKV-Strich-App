import InviteActions from "./InviteActions";
import { getErrorText, getSuccessText } from "./members-utils";
import type { AppLocale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";

export function ErrorMessage({
  code,
  locale,
}: {
  code?: string;
  locale: AppLocale;
}) {
  const text = getErrorText(code, locale);
  if (!text) return null;

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {text}
    </div>
  );
}

export function SuccessMessage({
  inviteUrl,
  action,
  locale,
}: {
  inviteUrl?: string;
  action?: string;
  locale: AppLocale;
}) {
  if (inviteUrl) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
        <div className="font-medium">{translate(locale, "members.invitationCreated")}</div>
        <div className="mt-2 break-all rounded-xl bg-white px-3 py-2 font-mono text-xs text-slate-700">
          {inviteUrl}
        </div>
        <div className="mt-3">
          <InviteActions inviteUrl={inviteUrl} />
        </div>
      </div>
    );
  }

  const text = getSuccessText(action, locale);
  if (!text) return null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      {text}
    </div>
  );
}