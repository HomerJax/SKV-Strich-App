import Link from "next/link";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClubMemberUserIds } from "@/lib/push/club-events";
import { sendPushToUsers } from "@/lib/push/send-push";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

function hasAdminAccess(role: string | null | undefined, isPowerUser: boolean) {
  return isPowerUser || role === "admin" || role === "power_user";
}

export default async function ClubAnnouncementsPage({ searchParams }: PageProps) {
  const { t } = await getServerI18n();
  const ctx = await getAuthContext();

  if (!ctx.user) redirect("/login");
  if (!ctx.activeClubId) redirect("/select-club");

  const membership =
    ctx.memberships.find((item) => item.club_id === ctx.activeClubId) ?? null;

  if (!hasAdminAccess(membership?.role, ctx.isPowerUser)) {
    redirect("/home");
  }

  const params = await searchParams;
  const successMessage = params?.success ?? "";
  const errorMessage = params?.error ?? "";

  async function sendAnnouncement(formData: FormData) {
    "use server";

    const { t: actionT } = await getServerI18n();
    const actionCtx = await getAuthContext();

    if (!actionCtx.user || !actionCtx.activeClubId) {
      redirect("/login");
    }

    const actionMembership =
      actionCtx.memberships.find(
        (item) => item.club_id === actionCtx.activeClubId,
      ) ?? null;

    if (!hasAdminAccess(actionMembership?.role, actionCtx.isPowerUser)) {
      redirect("/home");
    }

    const message = String(formData.get("message") ?? "").trim();

    if (message.length < 3) {
      redirect(
        `/admin/announcements?error=${encodeURIComponent(actionT("announcements.errorRequired"))}`,
      );
    }

    if (message.length > 280) {
      redirect(
        `/admin/announcements?error=${encodeURIComponent(actionT("announcements.errorMax"))}`,
      );
    }

    const clubId = actionCtx.activeClubId;
    const recipientUserIds = await getClubMemberUserIds(clubId, [
      actionCtx.user.id,
    ]);

    if (!recipientUserIds.length) {
      redirect(
        `/admin/announcements?error=${encodeURIComponent(actionT("announcements.errorNoRecipients"))}`,
      );
    }

    const admin = createAdminClient();
    const announcementId = randomUUID();
    const title = actionT("announcements.notificationTitle");

    const notificationRows = recipientUserIds.map((userId) => ({
      user_id: userId,
      club_id: clubId,
      type: "club_announcement",
      title,
      body: message,
      cta_href: "/home",
      cta_label: actionT("announcements.open"),
      dedupe_key: `club_announcement:${clubId}:${announcementId}:${userId}`,
    }));

    const { error: notificationError } = await admin
      .from("user_notifications")
      .insert(notificationRows);

    if (notificationError) {
      console.error("Club announcement in-app notification failed", notificationError);
    }

    try {
      await sendPushToUsers({
        userIds: recipientUserIds,
        title,
        body: message,
        url: "/home",
        preference: "announcements",
      });
    } catch (error) {
      console.error("Club announcement push failed", error);
      redirect(
        `/admin/announcements?error=${encodeURIComponent(actionT("announcements.errorPush"))}`,
      );
    }

    redirect(
      `/admin/announcements?success=${encodeURIComponent(
        actionT("announcements.success", { count: recipientUserIds.length }),
      )}`,
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-5 sm:px-6">
      <Link
        href="/admin"
        className="text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        ← {t("announcements.back")}
      </Link>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {t("announcements.section")}
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          {t("announcements.title")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {t("announcements.description")}
        </p>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {successMessage}
          </div>
        ) : null}

        <form action={sendAnnouncement} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-semibold text-slate-900"
            >
              {t("announcements.message")}
            </label>
            <textarea
              id="message"
              name="message"
              required
              maxLength={280}
              rows={5}
              placeholder={t("announcements.placeholder")}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
            <p className="mt-1 text-xs text-slate-500">{t("announcements.max")}</p>
          </div>

          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            {t("announcements.send")}
          </button>
        </form>
      </section>
    </main>
  );
}
