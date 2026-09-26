import { ImageResponse } from "next/og";
import ResultShareCard from "@/components/share/result-share/ResultShareCard";
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

    return new ImageResponse(<ResultShareCard data={data} />, {
      width: 1080,
      height: 1350,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
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