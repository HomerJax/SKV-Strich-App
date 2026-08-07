import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getProjectRef(value: string | undefined) {
  if (!value) return null;

  try {
    const hostname = new URL(value).hostname;
    return hostname.endsWith(".supabase.co") ? hostname.split(".")[0] ?? null : hostname;
  } catch {
    return "invalid-url";
  }
}

export async function GET() {
  return NextResponse.json({
    supabaseProjectRef: getProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL),
    appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
  });
}
