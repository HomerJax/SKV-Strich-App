import { ImageResponse } from "next/og";
import ResultShareCard from "@/components/share/result-share/ResultShareCard";
import { getResultShareData } from "@/lib/share/result-share";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const data = await getResultShareData(id);

    return new ImageResponse(<ResultShareCard data={data} />, {
      width: 1080,
      height: 1350,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Share-Bild konnte nicht erzeugt werden.";

    return new Response(message, {
      status: 500,
    });
  }
}