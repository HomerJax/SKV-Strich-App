import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendPushToUsers,
  type PushPreferenceKey,
} from "@/lib/push/send-push";

type ClubMembershipRow = {
  user_id: string | null;
};

type SendClubPushOptions = {
  clubId: string;
  title: string;
  body: string;
  url?: string;
  preference: PushPreferenceKey;
  excludeUserIds?: string[];
};

export async function getClubMemberUserIds(
  clubId: string,
  excludeUserIds: string[] = [],
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("club_memberships")
    .select("user_id")
    .eq("club_id", clubId);

  if (error) {
    throw new Error(
      `Club-Mitglieder konnten für Push nicht geladen werden: ${error.message}`,
    );
  }

  const excluded = new Set(excludeUserIds.filter(Boolean));

  return [
    ...new Set(
      ((data ?? []) as ClubMembershipRow[])
        .map((row) => row.user_id)
        .filter((userId): userId is string => Boolean(userId))
        .filter((userId) => !excluded.has(userId)),
    ),
  ];
}

export async function sendClubPush({
  clubId,
  title,
  body,
  url = "/home",
  preference,
  excludeUserIds = [],
}: SendClubPushOptions) {
  const userIds = await getClubMemberUserIds(clubId, excludeUserIds);

  return sendPushToUsers({
    userIds,
    title,
    body,
    url,
    preference,
  });
}
