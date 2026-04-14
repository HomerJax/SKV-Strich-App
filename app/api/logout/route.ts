import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function clearSession() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

function withClearedClubCookie(response: NextResponse) {
  response.cookies.set("active_club_id", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export async function GET(request: Request) {
  await clearSession();

  const url = new URL(request.url);
  const next = url.searchParams.get("next");
  const target =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/login";

  return withClearedClubCookie(NextResponse.redirect(new URL(target, url)));
}

export async function POST() {
  await clearSession();

  return withClearedClubCookie(NextResponse.json({ ok: true }));
}