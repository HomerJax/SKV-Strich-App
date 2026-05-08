import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type FinalizeResult = {
  sessionId: number;
  success: boolean;
  error?: string;
};

function getCronSecret() {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    throw new Error("CRON_SECRET is not configured.");
  }

  return secret;
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  return createClient(url, serviceRoleKey);
}

export async function GET(req: NextRequest) {
  let cronSecret: string;

  try {
    cronSecret = getCronSecret();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cron secret is not configured.";

    return NextResponse.json({ error: message }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${cronSecret}`;

  if (authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const { data: sessions, error: sessionsError } = await supabase
      .from("sessions")
      .select("id")
      .not("mvp_voting_closed_at", "is", null)
      .lte("mvp_voting_closed_at", new Date().toISOString())
      .is("mvp_voting_finalized_at", null);

    if (sessionsError) {
      return NextResponse.json(
        { error: "Failed to load sessions", details: sessionsError.message },
        { status: 500 }
      );
    }

    const results: FinalizeResult[] = [];

    for (const session of sessions ?? []) {
      const { error } = await supabase.rpc("finalize_mvp_voting_for_session", {
        p_session_id: session.id,
      });

      if (error) {
        results.push({
          sessionId: session.id,
          success: false,
          error: error.message,
        });
      } else {
        results.push({
          sessionId: session.id,
          success: true,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "MVP finalization cron failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}