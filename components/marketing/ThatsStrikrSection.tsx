import { ArrowUpRight, Instagram, MessageCircle, Play, Zap } from "lucide-react";
import InstagramReelEmbed from "./InstagramReelEmbed";

const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/getstrikr/";
const WHATSAPP_CHANNEL_URL = "https://whatsapp.com/channel/0029VbDksXIHVvTj4RgJs43v";

type Reel = {
  permalink: string;
  embedUrl: string;
  title: string;
};

// Add one or more published public Instagram URLs to the
// STRIKR_INSTAGRAM_REELS Vercel environment variable, separated by commas,
// semicolons or newlines. No video file is uploaded to strikr.
// Example: https://www.instagram.com/reel/REAL_PUBLIC_SHORTCODE/
function getManuallyConfiguredReels(): Reel[] {
  const configured = process.env.STRIKR_INSTAGRAM_REELS ?? "";
  const seen = new Set<string>();
  const reels: Reel[] = [];

  for (const raw of configured.split(/[;,\n]+/)) {
    const text = raw.trim();
    if (!text || reels.length >= 3) continue;

    try {
      const url = new URL(text);
      if (url.protocol !== "https:" || !["www.instagram.com", "instagram.com"].includes(url.hostname)) {
        continue;
      }
      const match = url.pathname.match(/^\/(reel|p)\/([A-Za-z0-9_-]+)\/?$/);
      if (!match) continue;

      const key = match[1] + "/" + match[2];
      if (seen.has(key)) continue;
      seen.add(key);

      reels.push({
        permalink: `https://www.instagram.com/${key}/`,
        embedUrl: `https://www.instagram.com/${key}/embed/`,
        title: reels.length === 0 ? "THAT'S STRIKR. – Der Spot" : "strikr im Einsatz",
      });
    } catch {
      // Ignore incomplete or non-Instagram input.
    }
  }

  return reels;
}

// Official Instagram API with Instagram Login: reads only published media from
// the authorized professional @getstrikr account. The access token stays server-side.
// Next.js caches responses for 24 hours, so new Reels appear without a redeploy.
async function getAutomaticallyPublishedReels(): Promise<Reel[]> {
  const token = process.env.STRIKR_INSTAGRAM_ACCESS_TOKEN?.trim();
  if (!token) return [];

  try {
    const url = new URL("https://graph.instagram.com/v25.0/me/media");
    url.searchParams.set("fields", "id,media_type,permalink,timestamp");
    url.searchParams.set("limit", "30");

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return [];

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || !("data" in payload) || !Array.isArray(payload.data)) return [];

    const items = payload.data as Array<Record<string, unknown>>;
    const sorted = [...items].sort((a, b) => {
      const left = typeof a.timestamp === "string" ? Date.parse(a.timestamp) : 0;
      const right = typeof b.timestamp === "string" ? Date.parse(b.timestamp) : 0;
      return (Number.isFinite(right) ? right : 0) - (Number.isFinite(left) ? left : 0);
    });

    const reels: Reel[] = [];
    const seen = new Set<string>();

    for (const entry of sorted) {
      if (typeof entry.permalink !== "string") continue;

      const permalink = new URL(entry.permalink);
      if (permalink.protocol !== "https:" || !["www.instagram.com", "instagram.com"].includes(permalink.hostname)) continue;

      // The /reel/ permalink is the reliable public signal even when the
      // API's optional media_product_type field is not exposed.
      const pathParts = permalink.pathname.split("/").filter(Boolean);
      if (pathParts.length !== 2 || pathParts[0] !== "reel" || !/^[A-Za-z0-9_-]+$/.test(pathParts[1])) continue;

      const shortcode = pathParts[1];
      if (seen.has(shortcode)) continue;
      seen.add(shortcode);

      reels.push({
        permalink: `https://www.instagram.com/reel/${shortcode}/`,
        embedUrl: `https://www.instagram.com/reel/${shortcode}/embed/`,
        title: reels.length === 0 ? "THAT'S STRIKR. – Neuester Reel" : "strikr im Einsatz",
      });
      if (reels.length === 3) break;
    }

    return reels;
  } catch {
    // Keep the landing page usable when Meta is temporarily unavailable.
    return [];
  }
}

export default async function ThatsStrikrSection() {
  const automaticReels = await getAutomaticallyPublishedReels();
  const reels = automaticReels.length ? automaticReels : getManuallyConfiguredReels();

  return (
    <section id="thats-strikr" aria-labelledby="thats-strikr-heading" className="relative overflow-hidden border-y border-white/10 bg-[#070e17] py-16 sm:py-20">
      <div className="pointer-events-none absolute -left-40 top-8 h-80 w-80 rounded-full bg-cyan-500/10 blur-[90px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-80 w-80 rounded-full bg-violet-500/10 blur-[90px]" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
              Real teams. Real moments.
            </p>
            <h2 id="thats-strikr-heading" className="mt-3 text-4xl font-black tracking-[-0.06em] text-white sm:text-6xl">
              THAT&apos;S STRIKR<span className="text-cyan-300">.</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/55 sm:text-base">
              Weniger labern. Mehr spielen. Clips, Team-Momente und alles, was strikr ausmacht.
            </p>
          </div>
          <a
            href={INSTAGRAM_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/20 bg-white/8 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-white/15"
            data-analytics-event="landing_instagram_click"
          >
            <Instagram className="h-4 w-4" aria-hidden="true" />
            @getstrikr <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        {reels.length ? (
          <div className={`mt-9 grid gap-4 ${reels.length === 1 ? "max-w-[420px]" : reels.length === 2 ? "max-w-4xl sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {reels.map((reel) => (
              <InstagramReelEmbed
                key={reel.permalink}
                permalink={reel.permalink}
                embedUrl={reel.embedUrl}
                title={reel.title}
              />
            ))}
          </div>
        ) : (
          <div className="mt-9 flex flex-col items-start gap-5 rounded-[26px] border border-white/10 bg-white/[0.045] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-300">
                <Play className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg font-black text-white">strikr auf Instagram.</h3>
                <p className="mt-1 max-w-lg text-sm leading-6 text-white/55">
                  Unsere Reels direkt bei @getstrikr. Der nächste Clip wird hier auch auf der Website abspielbar.
                </p>
              </div>
            </div>
            <a
              href={INSTAGRAM_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-white sm:w-auto"
            >
              Reels ansehen <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-5 rounded-[24px] border border-white/10 bg-white/[0.035] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1b6e55]/25 text-[#5bf0b1]">
              <MessageCircle className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#5bf0b1]">
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                Inside strikr
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-white">Updates direkt aus der Kabine.</h3>
              <p className="mt-1 text-sm leading-6 text-white/50">
                Neue Features, Sneak Peeks und Einblicke auf unserem WhatsApp-Kanal.
              </p>
            </div>
          </div>
          <a
            href={WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-analytics-event="landing_whatsapp_channel_click"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#5bf0b1]/35 bg-[#5bf0b1]/10 px-5 py-3 text-sm font-black text-[#91ffd2] transition hover:bg-[#5bf0b1]/20"
          >
            Inside strikr auf WhatsApp <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
