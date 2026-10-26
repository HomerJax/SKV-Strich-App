import { ImageResponse } from "next/og";
import ResultShareCard from "@/components/share/result-share/ResultShareCard";
import { ResultStoryShareCard, isStorySharePilotClub } from "@/components/share/result-share/StoryShareCard";
import { getTournamentShareData } from "@/lib/share/result-share";
import { localeFromAcceptLanguage, normalizeLocale } from "@/lib/i18n/config";

export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const locale = normalizeLocale(url.searchParams.get("lang")) ?? localeFromAcceptLanguage(request.headers.get("accept-language"));
    const data = await getTournamentShareData(id, locale);
    const story = url.searchParams.get("format") === "story";
    if (story && !isStorySharePilotClub(data.clubId)) {
      return new Response("Story-Layout nur für das Pilotteam verfügbar.", { status: 403 });
    }
    return new ImageResponse(
      story ? <ResultStoryShareCard data={data} tournament /> : <ResultShareCard data={data} />,
      { width: 1080, height: story ? 1920 : 1350, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Siegercard konnte nicht erstellt werden", { status: 500 });
  }
}
