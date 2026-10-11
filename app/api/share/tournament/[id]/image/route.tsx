import { ImageResponse } from "next/og";
import ResultShareCard from "@/components/share/result-share/ResultShareCard";
import { getTournamentShareData } from "@/lib/share/result-share";
import { localeFromAcceptLanguage, normalizeLocale } from "@/lib/i18n/config";

export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const locale = normalizeLocale(url.searchParams.get("lang")) ?? localeFromAcceptLanguage(request.headers.get("accept-language"));
    const data = await getTournamentShareData(id, locale);
    return new ImageResponse(<ResultShareCard data={data} />, { width: 1080, height: 1350, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Siegercard konnte nicht erstellt werden", { status: 500 });
  }
}
