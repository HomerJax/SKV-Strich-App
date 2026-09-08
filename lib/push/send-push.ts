import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getFirebaseMessaging } from "@/lib/push/firebase-admin";

type PushPlatform = "android" | "ios" | "web" | "unknown";

export type PushPreferenceKey =
  | "training_reminders"
  | "rsvp_updates"
  | "results"
  | "badges"
  | "announcements";

type SendPushOptions = {
  userIds: string[];
  title: string;
  body: string;
  url?: string;
  platform?: PushPlatform;
  preference?: PushPreferenceKey;
};

type PushSubscriptionRow = {
  token: string;
};

type PushPreferenceRow = {
  user_id: string;
  training_reminders: boolean;
  rsvp_updates: boolean;
  results: boolean;
  badges: boolean;
  announcements: boolean;
};

async function filterUsersByPreference(
  userIds: string[],
  preference?: PushPreferenceKey,
) {
  if (!preference || userIds.length === 0) {
    return userIds;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("push_preferences")
    .select(
      "user_id, training_reminders, rsvp_updates, results, badges, announcements",
    )
    .in("user_id", userIds);

  if (error) {
    throw new Error(
      `Push-Einstellungen konnten nicht geladen werden: ${error.message}`,
    );
  }

  const preferencesByUser = new Map(
    ((data ?? []) as PushPreferenceRow[]).map((row) => [row.user_id, row]),
  );

  // Keine gespeicherte Zeile bedeutet weiterhin: Standard = eingeschaltet.
  return userIds.filter((userId) => {
    const preferences = preferencesByUser.get(userId);
    return preferences ? preferences[preference] !== false : true;
  });
}

export async function sendPushToUsers({
  userIds,
  title,
  body,
  url = "/home",
  platform,
  preference,
}: SendPushOptions) {
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);

  if (!uniqueUserIds.length) {
    return {
      sent: 0,
      failed: 0,
      disabled: 0,
      filtered: 0,
      skipped: true,
      errors: [] as string[],
    };
  }

  const allowedUserIds = await filterUsersByPreference(
    uniqueUserIds,
    preference,
  );
  const filtered = uniqueUserIds.length - allowedUserIds.length;

  if (!allowedUserIds.length) {
    return {
      sent: 0,
      failed: 0,
      disabled: 0,
      filtered,
      skipped: true,
      errors: [] as string[],
    };
  }

  const supabase = createAdminClient();

  let query = supabase
    .from("push_subscriptions")
    .select("token")
    .in("user_id", allowedUserIds)
    .eq("enabled", true);

  if (platform) {
    query = query.eq("platform", platform);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Push Tokens konnten nicht geladen werden: ${error.message}`,
    );
  }

  const tokens = [
    ...new Set(((data ?? []) as PushSubscriptionRow[]).map((row) => row.token)),
  ];

  if (!tokens.length) {
    return {
      sent: 0,
      failed: 0,
      disabled: 0,
      filtered,
      skipped: true,
      errors: [] as string[],
    };
  }

  const messaging = getFirebaseMessaging();

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title,
      body,
    },
    data: {
      url,
    },
    android: {
      notification: {
        channelId: "default",
        sound: "default",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
        },
      },
    },
  });

  const invalidTokens: string[] = [];
  const errors: string[] = [];

  response.responses.forEach((result, index) => {
    const code = result.error?.code;

    if (code) {
      errors.push(code);
    }

    if (
      code === "messaging/invalid-registration-token" ||
      code === "messaging/registration-token-not-registered"
    ) {
      const token = tokens[index];

      if (token) {
        invalidTokens.push(token);
      }
    }
  });

  if (invalidTokens.length) {
    await supabase
      .from("push_subscriptions")
      .update({
        enabled: false,
        updated_at: new Date().toISOString(),
      })
      .in("token", invalidTokens);
  }

  return {
    sent: response.successCount,
    failed: response.failureCount,
    disabled: invalidTokens.length,
    filtered,
    skipped: false,
    errors: [...new Set(errors)],
  };
}
