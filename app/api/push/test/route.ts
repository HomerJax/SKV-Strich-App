import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { sendPushToUsers } from "@/lib/push/send-push";

export const runtime = "nodejs";

export async function POST() {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    const result = await sendPushToUsers({
      userIds: [ctx.user.id],
      title: "strikr Test",
      body: "Push-Benachrichtigungen sind verbunden.",
      url: "/home",
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Failed to send test push", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Test-Push konnte nicht gesendet werden.",
      },
      { status: 500 },
    );
  }
}
