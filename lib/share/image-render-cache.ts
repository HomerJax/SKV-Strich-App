import { createHash } from "node:crypto";
import { ImageResponse } from "next/og";

// Best-effort, per-instance cache only. Every request still runs its usual
// Supabase/club authorization and loads fresh share data BEFORE checking this
// cache. Never cache personalized image responses at the Vercel CDN.
const TTL_MS = 60_000;
const MAX_ITEMS = 12;
const MAX_BYTES = 24 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type ImageEntry = { bytes: Buffer; expiresAt: number };
const images = new Map<string, ImageEntry>();
const inFlight = new Map<string, Promise<Buffer>>();
let cachedBytes = 0;

export function shareImageKey(kind: string, data: unknown): string {
  return createHash("sha256")
    .update(kind)
    .update("\0")
    .update(JSON.stringify(data))
    .digest("hex");
}

// Supabase refreshes signed winner-photo URLs on each request. The short-lived
// signature is not part of the underlying image; normalize it for cache keys
// only. The real, freshly authorized signed URL is still used while rendering.
export function shareImageSourceKey(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.includes("/storage/v1/object/sign/")) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("token");
    return parsed.toString();
  } catch {
    return url;
  }
}

function remove(key: string) {
  const current = images.get(key);
  if (current) cachedBytes -= current.bytes.length;
  images.delete(key);
}

function save(key: string, bytes: Buffer) {
  if (bytes.length > MAX_IMAGE_BYTES) return;
  const now = Date.now();
  for (const [cacheKey, value] of images) {
    if (value.expiresAt <= now) remove(cacheKey);
  }
  remove(key);
  while (images.size >= MAX_ITEMS || cachedBytes + bytes.length > MAX_BYTES) {
    const oldest = images.keys().next().value;
    if (!oldest) break;
    remove(oldest);
  }
  images.set(key, { bytes, expiresAt: now + TTL_MS });
  cachedBytes += bytes.length;
}

export async function cachedShareImage(
  key: string,
  render: () => ImageResponse,
): Promise<Response> {
  const existing = images.get(key);
  let bytes: Buffer;

  if (existing && existing.expiresAt > Date.now()) {
    // Refresh insertion order for simple LRU eviction.
    images.delete(key);
    images.set(key, existing);
    bytes = existing.bytes;
  } else {
    if (existing) remove(key);
    let work = inFlight.get(key);
    if (!work) {
      work = (async () => {
        const response = render();
        const result = Buffer.from(await response.arrayBuffer());
        save(key, result);
        return result;
      })();
      inFlight.set(key, work);
      void work.then(
        () => { if (inFlight.get(key) === work) inFlight.delete(key); },
        () => { if (inFlight.get(key) === work) inFlight.delete(key); },
      );
    }
    bytes = await work;
  }

  // Copy into a standalone ArrayBuffer: Buffer's underlying allocation can
  // have a wider byte range and is not itself a DOM BodyInit.
  const body = new Uint8Array(bytes.length);
  body.set(bytes);

  return new Response(body.buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store, max-age=0",
      "Vary": "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
