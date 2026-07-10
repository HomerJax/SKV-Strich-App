import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getFirebaseMessaging } from "@/lib/push/firebase-admin";

type SendPushOptions = {
  userIds: string[];
  title: string;
  body: string;
  url?: string;
};

type PushSubscriptionRow = {
  token: string;
};

export async function sendPushToUsers({
  userIds,
  title,
  body,
  url = "/home",
}: SendPushOptions) {
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);

  if (!uniqueUserIds.length) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("token")
    .in("user_id", uniqueUserIds)
    .eq("enabled", true);

  if (error) {
    throw new Error(
      `Push Tokens konnten nicht geladen werden: ${error.message}`,
    );
  }

  const tokens = [
    ...new Set(((data ?? []) as PushSubscriptionRow[]).map((row) => row.token)),
  ];

  if (!tokens.length) {
    return { sent: 0, failed: 0, skipped: true };
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

  response.responses.forEach((result, index) => {
    const code = result.error?.code;

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
    skipped: false,
  };
}
