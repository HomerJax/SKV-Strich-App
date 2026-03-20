import InviteActions from "./InviteActions";
import { buildInviteUrl, getErrorText, getSuccessText } from "./members-utils";

export function ErrorMessage({ code }: { code?: string }) {
  const text = getErrorText(code);
  if (!text) return null;

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {text}
    </div>
  );
}

export function SuccessMessage({
  token,
  action,
}: {
  token?: string;
  action?: string;
}) {
  if (token) {
    const inviteUrl = buildInviteUrl(token);

    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
        <div className="font-medium">Einladung erstellt</div>
        <div className="mt-2 break-all rounded-xl bg-white px-3 py-2 font-mono text-xs text-slate-700">
          {inviteUrl}
        </div>
        <div className="mt-3">
          <InviteActions inviteUrl={inviteUrl} />
        </div>
      </div>
    );
  }

  const text = getSuccessText(action);
  if (!text) return null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      {text}
    </div>
  );
}