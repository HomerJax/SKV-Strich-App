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

    return new ImageResponse(
      (
        <div
          style={{
            width: "1080px",
            height: "1920px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "radial-gradient(circle at 50% 12%, rgba(255,255,255,0.16), transparent 30%), linear-gradient(180deg,#020617 0%,#0f172a 48%,#020617 100%)",
            padding: "132px 54px 150px",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "972px",
              height: "1215px",
              display: "flex",
              borderRadius: "54px",
              boxShadow: "0 42px 120px rgba(0,0,0,0.38)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "1200px",
                height: "1500px",
                display: "flex",
                transform: "scale(0.81)",
                transformOrigin: "top left",
              }}
            >
              <ResultShareCard data={data} />
            </div>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1920,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Share-Bild konnte nicht erzeugt werden.";

    return new Response(message, {
      status: 500,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  }
}