import { NextResponse } from "next/server";

export function GET() {
  const url = new URL("https://www.strikr.team/");

  url.searchParams.set("utm_source", "whatsapp");
  url.searchParams.set("utm_medium", "trainergruppe");
  url.searchParams.set("utm_campaign", "dahsc_special_v1");
  url.searchParams.set("utm_content", "freund_post");

  return NextResponse.redirect(url, 307);
}
