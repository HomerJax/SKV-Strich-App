import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/context";
import { sendPushToUsers } from "@/lib/push/send-push";

type SearchParams = Promise<{
  sent?: string;
  failed?: string;
  error?: string;
}>;

type PageProps = {
  searchParams?: SearchParams;
};

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

async function getAndroidRecipients() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("user_id, token")
    .eq("platform", "android")
    .eq("enabled", true);

  if (error) {
    throw new Error(
      `Android Push-Empfänger konnten nicht geladen werden: ${error.message}`,
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

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!title || !body) {
    redirect("/admin/push-testers?error=missing-text");
  }

  if (title.length > 80 || body.length > 240) {
    redirect("/admin/push-testers?error=text-too-long");
  }

  const recipients = await getAndroidRecipients();

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

function getErrorMessage(error: string | undefined) {
  switch (error) {
    case "missing-text":
      return "Titel und Nachricht müssen ausgefüllt sein.";
    case "text-too-long":
      return "Titel oder Nachricht sind zu lang.";
    case "no-recipients":
      return "Noch kein Android-Gerät hat sich für Push registriert.";
    case "send-failed":
      return "Die Nachricht konnte nicht gesendet werden.";
    default:
      return null;
  }
}

export default async function PushTestersPage({ searchParams }: PageProps) {
  await requirePowerUser();

  const params = await searchParams;
  const recipients = await getAndroidRecipients();
  const errorMessage = getErrorMessage(params?.error);
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
          Android Test-Push
        </h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Sendet eine Push-Nachricht ausschließlich an aktuell registrierte
          Android-Geräte. Tester müssen Release 6 installiert und strikr danach
          mindestens einmal geöffnet haben.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-black text-neutral-950">
            {recipients.userCount}
          </div>
          <div className="mt-1 text-xs font-semibold text-neutral-500">
            registrierte Nutzer
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-black text-neutral-950">
            {recipients.deviceCount}
          </div>
          <div className="mt-1 text-xs font-semibold text-neutral-500">
            Android-Geräte
          </div>
        </div>
      </div>

      {hasResult ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
          Gesendet: {sent} · Fehlgeschlagen: {failed}
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
              Titel
            </label>
            <input
              id="title"
              name="title"
              maxLength={80}
              defaultValue="strikr Android Test"
              className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-900"
            />
          </div>

          <div>
            <label
              htmlFor="body"
              className="text-sm font-semibold text-neutral-900"
            >
              Nachricht
            </label>
            <textarea
              id="body"
              name="body"
              maxLength={240}
              rows={5}
              defaultValue="Push ist jetzt aktiv 🎉 Bitte kurz testen, ob die Nachricht bei euch angekommen ist."
              className="mt-2 w-full resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-sm leading-6 outline-none focus:border-neutral-900"
            />
          </div>

          <button
            type="submit"
            disabled={recipients.deviceCount === 0}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            An Android-Tester senden
          </button>
        </form>
      </div>

      <div className="rounded-2xl bg-neutral-950 p-4 text-sm leading-6 text-neutral-300">
        Die 14 Google-Play-Tester sind nicht automatisch Push-Empfänger. Hier
        erscheinen nur Geräte, die den neuen Build installiert, geöffnet und
        Benachrichtigungen erlaubt haben.
      </div>
    </main>
  );
}
