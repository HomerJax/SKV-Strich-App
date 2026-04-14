import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  const response = NextResponse.json({ ok: true });

  response.cookies.set("active_club_id", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}