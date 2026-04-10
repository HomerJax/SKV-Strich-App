import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_notifications")
    .select(`
      id,
      type,
      title,
      body,
      cta_href,
      cta_label,
      payload,
      created_at,
      seen_at
    `)
    .eq("user_id", user.id)
    .is("seen_at", null)
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    return NextResponse.json(
      {
        error: "Failed to load unseen notifications",
        details: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    notifications: data ?? [],
  });
}