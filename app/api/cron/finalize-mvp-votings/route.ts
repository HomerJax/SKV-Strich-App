import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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

  const results: Array<{
    sessionId: number;
    success: boolean;
    error?: string;
  }> = [];

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
}