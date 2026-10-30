import { ImageResponse } from "next/og";
import { cachedShareImage, shareImageKey, shareImageSourceKey } from "@/lib/share/image-render-cache";
import ResultShareCard from "@/components/share/result-share/ResultShareCard";
import { ResultStoryShareCard, isStorySharePilotClub } from "@/components/share/result-share/StoryShareCard";
import { getResultShareData } from "@/lib/share/result-share";
import { localeFromAcceptLanguage, normalizeLocale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const locale =
      normalizeLocale(url.searchParams.get("lang")) ??
      localeFromAcceptLanguage(request.headers.get("accept-language"));
    const data = await getResultShareData(id, locale);

    const story = url.searchParams.get("format") === "story";
    if (story && !isStorySharePilotClub(data.clubId)) {
      return new Response("Story-Layout nur für das Pilotteam verfügbar.", { status: 403 });
    }

    // RLS-protected session/result data is loaded afresh before checking the
    // short-lived render cache. Expiring Supabase signed photo tokens do not
    // force re-rendering when the underlying image is unchanged.
    const imageKey = shareImageKey("result-v1", {
      ...data,
      story,
      winnerPhotoUrl: shareImageSourceKey(data.winnerPhotoUrl),
    });

    return cachedShareImage(imageKey, () => new ImageResponse(story ? <ResultStoryShareCard data={data} /> : <ResultShareCard data={data} />, {
      width: 1080,
      height: story ? 1920 : 1350,
    }));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : translate(
            localeFromAcceptLanguage(request.headers.get("accept-language")),
            "resultShare.shareImageFailed",
          );

    return new Response(message, {
      status: 500,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  }
}