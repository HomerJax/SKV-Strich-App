import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/context";
import { sendPushToUsers } from "@/lib/push/send-push";
import { getServerI18n } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";

type SearchParams = Promise<{
  sent?: string;
  failed?: string;
  error?: string;
}>;

type PageProps = {
  searchParams?: SearchParams;
};

type Translate = (key: MessageKey, params?: Record<string, string | number | null | undefined>) => string;

type AndroidSubscriptionRow = {
  user_id: string;
  token: string;
};

async function requirePowerUser() {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    redirect("/login");
  }

  if (!ctx.isPowerUser) {
    redirect("/home");
  }

  return ctx;
}

async function getAndroidRecipients(t: Translate) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("user_id, token")
    .eq("platform", "android")
    .eq("enabled", true);

  if (error) {
    throw new Error(
      t("pushTesters.loadFailed", { error: error.message }),
    );
  }

  const rows = (data ?? []) as AndroidSubscriptionRow[];
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  const tokens = [...new Set(rows.map((row) => row.token).filter(Boolean))];

  return {
    userIds,
    userCount: userIds.length,
    deviceCount: tokens.length,
  };
}

async function sendAndroidTesterPush(formData: FormData) {
  "use server";

  await requirePowerUser();
  const { t } = await getServerI18n();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!title || !body) {
    redirect("/admin/push-testers?error=missing-text");
  }

  if (title.length > 80 || body.length > 240) {
    redirect("/admin/push-testers?error=text-too-long");
  }

  const recipients = await getAndroidRecipients(t);

  if (recipients.userIds.length === 0) {
    redirect("/admin/push-testers?error=no-recipients");
  }

  let result: Awaited<ReturnType<typeof sendPushToUsers>>;

  try {
    result = await sendPushToUsers({
      userIds: recipients.userIds,
      title,
      body,
      url: "/home",
      platform: "android",
    });
  } catch (error) {
    console.error("Android tester broadcast failed", error);
    redirect("/admin/push-testers?error=send-failed");
  }

  redirect(`/admin/push-testers?sent=${result.sent}&failed=${result.failed}`);
}

function getErrorMessage(error: string | undefined, t: Translate) {
  switch (error) {
    case "missing-text":
      return t("pushTesters.missingText");
    case "text-too-long":
      return t("pushTesters.textTooLong");
    case "no-recipients":
      return t("pushTesters.noRecipients");
    case "send-failed":
      return t("pushTesters.sendFailed");
    default:
      return null;
  }
}

export default async function PushTestersPage({ searchParams }: PageProps) {
  await requirePowerUser();
  const { t } = await getServerI18n();

  const params = await searchParams;
  const recipients = await getAndroidRecipients(t);
  const errorMessage = getErrorMessage(params?.error, t);
  const sent = Number(params?.sent ?? NaN);
  const failed = Number(params?.failed ?? NaN);
  const hasResult = Number.isFinite(sent) && Number.isFinite(failed);

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          strikr power user
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-neutral-950">
          {t("pushTesters.title")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          {t("pushTesters.description")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-black text-neutral-950">
            {recipients.userCount}
          </div>
          <div className="mt-1 text-xs font-semibold text-neutral-500">
            {t("pushTesters.registeredUsers")}
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-black text-neutral-950">
            {recipients.deviceCount}
          </div>
          <div className="mt-1 text-xs font-semibold text-neutral-500">
            {t("pushTesters.devices")}
          </div>
        </div>
      </div>

      {hasResult ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
          {t("pushTesters.result", { sent, failed })}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <form action={sendAndroidTesterPush} className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="text-sm font-semibold text-neutral-900"
            >
              {t("pushTesters.titleLabel")}
            </label>
            <input
              id="title"
              name="title"
              maxLength={80}
              defaultValue={t("pushTesters.defaultTitle")}
              className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-900"
            />
          </div>

          <div>
            <label
              htmlFor="body"
              className="text-sm font-semibold text-neutral-900"
            >
              {t("pushTesters.messageLabel")}
            </label>
            <textarea
              id="body"
              name="body"
              maxLength={240}
              rows={5}
              defaultValue={t("pushTesters.defaultBody")}
              className="mt-2 w-full resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-sm leading-6 outline-none focus:border-neutral-900"
            />
          </div>

          <button
            type="submit"
            disabled={recipients.deviceCount === 0}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("pushTesters.send")}
          </button>
        </form>
      </div>

      <div className="rounded-2xl bg-neutral-950 p-4 text-sm leading-6 text-neutral-300">
        {t("pushTesters.note")}
      </div>
    </main>
  );
}
