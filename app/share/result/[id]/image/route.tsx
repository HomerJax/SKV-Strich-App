import { ImageResponse } from "next/og";
import { getResultShareData } from "@/lib/share/result-share";
import ShareCardShell from "@/components/share/ShareCardShell";
import ResultShareCard from "@/components/share/result-share/ResultShareCard";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const data = await getResultShareData(id);

    return new ImageResponse(
      <ShareCardShell branding={data.branding}>
        <ResultShareCard data={data} />
      </ShareCardShell>,
      {
        width: 1200,
        height: 1500,
      }
    );
  } catch (error) {
    console.error("Share result image error:", error);

    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler";

    return new ImageResponse(
      <div
        style={{
          width: "1200px",
          height: "1500px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#07122f",
          color: "#ffffff",
          fontSize: 32,
          fontFamily: "sans-serif",
          padding: "80px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 42,
            marginBottom: 24,
          }}
        >
          Fehler beim Laden der Result-Card
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            opacity: 0.8,
            maxWidth: "900px",
          }}
        >
          {message}
        </div>
      </div>,
      {
        width: 1200,
        height: 1500,
      }
    );
  }
}