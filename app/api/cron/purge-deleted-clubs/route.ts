import { NextRequest, NextResponse } from "next/server";
import { purgeExpiredDeletedClubs } from "@/lib/clubs/deletion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 }
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await purgeExpiredDeletedClubs();
    const failed = results.filter((result) => !result.ok);

    return NextResponse.json({
      ok: failed.length === 0,
      processed: results.length,
      deleted: results.length - failed.length,
      failed: failed.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Deleted club purge failed.",
      },
      { status: 500 }
    );
  }
}
