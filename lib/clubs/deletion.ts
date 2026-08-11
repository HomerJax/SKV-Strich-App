import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push/send-push";
import { listAllAuthUsers } from "@/lib/supabase/power-user-admin";

const RETENTION_DAYS = 14;

type ClubRow = {
  id: string;
  display_name: string | null;
  name: string | null;
  logo_path: string | null;
  deleted_at: string | null;
  purge_after: string | null;
};

type SessionRow = {
  winner_photo_path: string | null;
};

function getClubName(club: Pick<ClubRow, "display_name" | "name">) {
  return club.display_name?.trim() || club.name?.trim() || "Unbenannter Club";
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function removeStorageFiles(bucket: string, paths: string[]) {
  const cleanPaths = Array.from(
    new Set(paths.map((path) => path.trim()).filter(Boolean))
  );

  if (!cleanPaths.length) return;

  const admin = createAdminClient();

  for (let index = 0; index < cleanPaths.length; index += 100) {
    const { error } = await admin.storage
      .from(bucket)
      .remove(cleanPaths.slice(index, index + 100));

    if (error) {
      console.warn(`Club purge: storage cleanup failed for ${bucket}`, error);
    }
  }
}

async function getClubAdminUserIds(clubId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("club_memberships")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("role", "admin");

  if (error) {
    throw new Error(`Club-Admins konnten nicht geladen werden: ${error.message}`);
  }

  return [
    ...new Set(
      ((data ?? []) as { user_id: string }[])
        .map((row) => row.user_id)
        .filter(Boolean)
    ),
  ];
}

async function insertAdminNotifications(params: {
  clubId: string;
  adminUserIds: string[];
  type: string;
  title: string;
  body: string;
  dedupeSuffix: string;
}) {
  if (!params.adminUserIds.length) return;

  const admin = createAdminClient();
  const rows = params.adminUserIds.map((userId) => ({
    user_id: userId,
    club_id: params.clubId,
    type: params.type,
    title: params.title,
    body: params.body,
    cta_href: "/select-club",
    cta_label: "Zu meinen Clubs",
    dedupe_key: `${params.type}:${params.clubId}:${params.dedupeSuffix}:${userId}`,
  }));

  const { error } = await admin
    .from("user_notifications")
    .upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });

  if (error) {
    console.warn("Club deletion: in-app notification failed", error);
  }
}

async function sendAdminPush(params: {
  adminUserIds: string[];
  title: string;
  body: string;
}) {
  if (!params.adminUserIds.length) return;

  try {
    await sendPushToUsers({
      userIds: params.adminUserIds,
      title: params.title,
      body: params.body,
      url: "/select-club",
    });
  } catch (error) {
    console.warn("Club deletion: push notification failed", error);
  }
}

async function sendDeletionEmails(params: {
  adminUserIds: string[];
  clubName: string;
  purgeAfter: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CLUB_DELETION_FROM_EMAIL;

  if (!apiKey || !from || !params.adminUserIds.length) {
    return { sent: 0, skipped: true };
  }

  const users = await listAllAuthUsers().catch(() => []);
  const wanted = new Set(params.adminUserIds);
  const emails = [
    ...new Set(
      users
        .filter((user) => wanted.has(user.id))
        .map((user) => user.email?.trim() || "")
        .filter(Boolean)
    ),
  ];

  if (!emails.length) return { sent: 0, skipped: true };

  const purgeDate = new Date(params.purgeAfter).toLocaleDateString("de-DE");
  let sent = 0;

  for (const email of emails) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: `strikr: Club „${params.clubName}“ wurde gelöscht`,
          text: [
            `Der Club „${params.clubName}“ wurde in strikr zur Löschung vorgemerkt und ist nicht mehr verfügbar.`,
            "",
            `Bis einschließlich ${purgeDate} kann der Club vollständig wiederhergestellt werden.`,
            "Falls die Löschung nicht beabsichtigt war, melde dich bitte innerhalb dieser Frist bei uns.",
            "Nach Ablauf der 14 Tage werden die Clubdaten endgültig gelöscht.",
          ].join("\n"),
        }),
      });

      if (response.ok) sent += 1;
      else console.warn("Club deletion email failed", response.status);
    } catch (error) {
      console.warn("Club deletion email failed", error);
    }
  }

  return { sent, skipped: false };
}

export async function scheduleClubDeletion(params: {
  clubId: string;
  deletedBy: string;
}) {
  const admin = createAdminClient();
  const { data: club, error: clubError } = await admin
    .from("clubs")
    .select("id, display_name, name, logo_path, deleted_at, purge_after")
    .eq("id", params.clubId)
    .maybeSingle<ClubRow>();

  if (clubError || !club) {
    throw new Error(clubError?.message || "Club wurde nicht gefunden.");
  }

  const clubName = getClubName(club);

  if (club.deleted_at && club.purge_after) {
    return {
      clubName,
      deletedAt: club.deleted_at,
      purgeAfter: club.purge_after,
      alreadyScheduled: true,
    };
  }

  const now = new Date();
  const deletedAt = now.toISOString();
  const purgeAfter = addDays(now, RETENTION_DAYS).toISOString();
  const adminUserIds = await getClubAdminUserIds(params.clubId);

  const { error: updateError } = await admin
    .from("clubs")
    .update({
      deleted_at: deletedAt,
      purge_after: purgeAfter,
      deleted_by: params.deletedBy,
    })
    .eq("id", params.clubId)
    .is("deleted_at", null);

  if (updateError) {
    throw new Error(`Club konnte nicht gelöscht werden: ${updateError.message}`);
  }

  const title = `Club „${clubName}“ wurde gelöscht`;
  const body =
    "Der Club ist jetzt deaktiviert. Innerhalb von 14 Tagen kann er vollständig wiederhergestellt werden.";

  await Promise.all([
    insertAdminNotifications({
      clubId: params.clubId,
      adminUserIds,
      type: "club_deletion_scheduled",
      title,
      body,
      dedupeSuffix: deletedAt,
    }),
    sendAdminPush({ adminUserIds, title, body }),
    sendDeletionEmails({ adminUserIds, clubName, purgeAfter }),
  ]);

  return {
    clubName,
    deletedAt,
    purgeAfter,
    alreadyScheduled: false,
  };
}

export async function restoreClub(params: {
  clubId: string;
  restoredBy: string;
}) {
  const admin = createAdminClient();
  const { data: club, error: clubError } = await admin
    .from("clubs")
    .select("id, display_name, name, logo_path, deleted_at, purge_after")
    .eq("id", params.clubId)
    .maybeSingle<ClubRow>();

  if (clubError || !club) {
    throw new Error(clubError?.message || "Club wurde nicht gefunden.");
  }

  if (!club.deleted_at) {
    return { clubName: getClubName(club), restored: false };
  }

  const { error } = await admin
    .from("clubs")
    .update({ deleted_at: null, purge_after: null, deleted_by: null })
    .eq("id", params.clubId)
    .not("deleted_at", "is", null);

  if (error) {
    throw new Error(`Club konnte nicht wiederhergestellt werden: ${error.message}`);
  }

  const clubName = getClubName(club);
  const adminUserIds = await getClubAdminUserIds(params.clubId);
  const title = `Club „${clubName}“ wurde wiederhergestellt`;
  const body = "Der Club ist wieder vollständig in strikr verfügbar.";

  await Promise.all([
    insertAdminNotifications({
      clubId: params.clubId,
      adminUserIds,
      type: "club_restored",
      title,
      body,
      dedupeSuffix: new Date().toISOString(),
    }),
    sendAdminPush({ adminUserIds, title, body }),
  ]);

  return { clubName, restored: true, restoredBy: params.restoredBy };
}

export async function permanentlyDeleteClub(clubId: string) {
  const admin = createAdminClient();
  const [{ data: club, error: clubError }, { data: sessions, error: sessionsError }] =
    await Promise.all([
      admin
        .from("clubs")
        .select("id, display_name, name, logo_path, deleted_at, purge_after")
        .eq("id", clubId)
        .maybeSingle<ClubRow>(),
      admin
        .from("sessions")
        .select("winner_photo_path")
        .eq("club_id", clubId),
    ]);

  if (clubError || sessionsError || !club) {
    throw new Error(clubError?.message || sessionsError?.message || "Club nicht gefunden.");
  }

  if (!club.deleted_at || !club.purge_after) {
    throw new Error("Nur vorgemerkte Clubs dürfen endgültig gelöscht werden.");
  }

  if (new Date(club.purge_after).getTime() > Date.now()) {
    throw new Error("Die 14-Tage-Frist ist noch nicht abgelaufen.");
  }

  const { error: notificationError } = await admin
    .from("user_notifications")
    .delete()
    .eq("club_id", clubId);

  if (notificationError) {
    throw new Error(`Club-Benachrichtigungen konnten nicht gelöscht werden: ${notificationError.message}`);
  }

  const { error: deleteError } = await admin.from("clubs").delete().eq("id", clubId);

  if (deleteError) {
    throw new Error(`Club konnte nicht endgültig gelöscht werden: ${deleteError.message}`);
  }

  await Promise.all([
    club.logo_path
      ? removeStorageFiles("club-logos", [club.logo_path])
      : Promise.resolve(),
    removeStorageFiles(
      "session-photos",
      ((sessions ?? []) as SessionRow[])
        .map((session) => session.winner_photo_path)
        .filter((path): path is string => Boolean(path))
    ),
  ]);

  return { clubName: getClubName(club) };
}

export async function purgeExpiredDeletedClubs() {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("clubs")
    .select("id")
    .not("deleted_at", "is", null)
    .lte("purge_after", now);

  if (error) {
    throw new Error(`Papierkorb konnte nicht geprüft werden: ${error.message}`);
  }

  const clubIds = ((data ?? []) as { id: string }[]).map((row) => row.id);
  const results: Array<{ clubId: string; ok: boolean; error?: string }> = [];

  for (const clubId of clubIds) {
    try {
      await permanentlyDeleteClub(clubId);
      results.push({ clubId, ok: true });
    } catch (error) {
      results.push({
        clubId,
        ok: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    }
  }

  return results;
}
