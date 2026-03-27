/* eslint-disable @next/next/no-img-element */
import { ResultShareData } from "@/lib/share/types";
import { SHARE_THEME } from "@/lib/share/brand";

export default function ResultShareCard({
  data,
}: {
  data: ResultShareData;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 900,
            letterSpacing: "-1.4px",
            lineHeight: 1,
          }}
        >
          {data.title}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: SHARE_THEME.muted,
          }}
        >
          {data.date}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "720px",
          borderRadius: 36,
          overflow: "hidden",
          border: `1px solid ${SHARE_THEME.cardBorder}`,
          background: "rgba(255,255,255,0.06)",
        }}
      >
        {data.winnerPhotoUrl ? (
          <img
            src={data.winnerPhotoUrl}
            alt="Siegerfoto"
            width={1200}
            height={720}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              color: SHARE_THEME.muted,
            }}
          >
            Kein Siegerfoto
          </div>
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(to top, rgba(7,18,47,0.88), rgba(7,18,47,0.28), transparent)",
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 32,
            right: 32,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxWidth: "35%",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: "rgba(255,255,255,0.72)",
              }}
            >
              {data.teamAName}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 88,
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {data.goalsA}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 800,
              opacity: 0.55,
              marginBottom: 16,
            }}
          >
            :
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
              maxWidth: "35%",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: "rgba(255,255,255,0.72)",
              }}
            >
              {data.teamBName}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 88,
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {data.goalsB}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "26px 32px",
          borderRadius: 28,
          background: SHARE_THEME.accentSoft,
          border: `1px solid ${SHARE_THEME.cardBorder}`,
          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: SHARE_THEME.muted,
            textTransform: "uppercase",
            letterSpacing: "2px",
            fontWeight: 700,
          }}
        >
          Sieger
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 44,
            fontWeight: 900,
            letterSpacing: "-1px",
            textAlign: "right",
          }}
        >
          {data.winnerLabel}
        </div>
      </div>
    </div>
  );
}