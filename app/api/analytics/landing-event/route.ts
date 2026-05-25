import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  event_name?: string;
  path?: string;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
};

function cleanText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function getReferrerHost(referrer: string | null) {
  if (!referrer) return null;

  try {
    return new URL(referrer).hostname.replace(/^www\./, "").slice(0, 160);
  } catch {
    return null;
  }
}

function getDeviceType(userAgent: string) {
  const ua = userAgent.toLowerCase();

  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobile|iphone|android/.test(ua)) return "mobile";
  return "desktop";
}

function getUserAgentFamily(userAgent: string) {
  const ua = userAgent.toLowerCase();

  if (ua.includes("instagram")) return "instagram";
  if (ua.includes("whatsapp")) return "whatsapp";
  if (ua.includes("fbav") || ua.includes("fban")) return "facebook";
  if (ua.includes("tiktok")) return "tiktok";
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("chrome")) return "chrome";
  if (ua.includes("safari")) return "safari";
  if (ua.includes("firefox")) return "firefox";

  return "other";
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Payload;
    const eventName = cleanText(payload.event_name, 120);

    if (!eventName) {
      return NextResponse.json({ ok: true });
    }

    const userAgent = request.headers.get("user-agent") ?? "";
    const referrer = cleanText(payload.referrer, 800);
    const countryCode =
      request.headers.get("x-vercel-ip-country") ??
      request.headers.get("cf-ipcountry") ??
      null;

    const admin = createAdminClient();

    await admin.from("landing_page_events").insert({
      event_name: eventName,
      path: cleanText(payload.path, 300) ?? "/",

      utm_source: cleanText(payload.utm_source, 120),
      utm_medium: cleanText(payload.utm_medium, 120),
      utm_campaign: cleanText(payload.utm_campaign, 160),
      referrer,
      referrer_host: getReferrerHost(referrer),

      country_code: cleanText(countryCode, 12),
      device_type: getDeviceType(userAgent),
      user_agent_family: getUserAgentFamily(userAgent),

      app_env: process.env.NEXT_PUBLIC_APP_ENV ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
