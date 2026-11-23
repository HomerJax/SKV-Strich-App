import type { Metadata } from "next";
import { createHash, timingSafeEqual } from "node:crypto";
import { notFound } from "next/navigation";
import RonaldDemo from "./RonaldDemo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Persönliche strikr Demo · DJK AH",
  description: "Private Beispiel-Demo für einen Freizeitkick. Keine echten Vereinsdaten.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

// Only the SHA-256 digest is stored in source, never the shareable access token.
// A forwarded link works for whoever possesses it: a low-friction, unlisted DEMO,
// not an authenticated account or access to actual club data.
const LINK_DIGEST = "c8c9711503c566b34415997216ca78c8d183d75b9515a9c82602dc74ef936d73";

export default async function RonaldDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string | string[] }>;
}) {
  const params = await searchParams;
  const key = typeof params.key === "string" ? params.key : "";
  const digest = createHash("sha256").update(key).digest();
  if (key.length < 32 || !timingSafeEqual(digest, Buffer.from(LINK_DIGEST, "hex"))) {
    notFound();
  }
  return <RonaldDemo />;
}
