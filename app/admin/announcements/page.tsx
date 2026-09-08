import Link from "next/link";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClubMemberUserIds } from "@/lib/push/club-events";
import { sendPushToUsers } from "@/lib/push/send-push";

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
        "/admin/announcements?error=Bitte%20eine%20Nachricht%20eingeben.",
      );
    }

    if (message.length > 280) {
      redirect(
        "/admin/announcements?error=Die%20Nachricht%20darf%20maximal%20280%20Zeichen%20lang%20sein.",
      );
    }

    const clubId = actionCtx.activeClubId;
    const recipientUserIds = await getClubMemberUserIds(clubId, [
      actionCtx.user.id,
    ]);

    if (!recipientUserIds.length) {
      redirect(
        "/admin/announcements?error=Es%20gibt%20keine%20weiteren%20Mitglieder%20mit%20Account.",
      );
    }

    const admin = createAdminClient();
    const announcementId = randomUUID();
    const title = "Club-Ankündigung 📣";

    const notificationRows = recipientUserIds.map((userId) => ({
      user_id: userId,
      club_id: clubId,
      type: "club_announcement",
      title,
      body: message,
      cta_href: "/home",
      cta_label: "Öffnen",
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
        "/admin/announcements?error=Die%20Ankündigung%20konnte%20nicht%20als%20Push%20gesendet%20werden.",
      );
    }

    redirect(
      `/admin/announcements?success=${encodeURIComponent(
        `Ankündigung an ${recipientUserIds.length} Mitglieder versendet.`,
      )}`,
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-5 sm:px-6">
      <Link
        href="/admin"
        className="text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        ← Zurück zum Adminbereich
      </Link>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Kommunikation
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          Club-Ankündigung senden
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Schicke eine wichtige Nachricht an alle Mitglieder mit strikr-Account.
          Mitglieder können Club-Ankündigungen in ihren Push-Einstellungen
          deaktivieren.
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
              Nachricht
            </label>
            <textarea
              id="message"
              name="message"
              required
              maxLength={280}
              rows={5}
              placeholder="z. B. Training morgen beginnt ausnahmsweise um 19:30 Uhr."
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
            <p className="mt-1 text-xs text-slate-500">Maximal 280 Zeichen.</p>
          </div>

          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Ankündigung senden
          </button>
        </form>
      </section>
    </main>
  );
}
