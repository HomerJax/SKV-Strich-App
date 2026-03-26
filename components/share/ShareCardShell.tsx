import { ReactNode } from "react";
import { ShareBranding } from "@/lib/share/types";
import { SHARE_THEME } from "@/lib/share/brand";

export default function ShareCardShell({
  branding,
  children,
}: {
  branding: ShareBranding;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: "1200px",
        height: "1500px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: `linear-gradient(135deg, ${SHARE_THEME.primary}, ${SHARE_THEME.secondary})`,
        color: SHARE_THEME.text,
        padding: "52px",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          pointerEvents: "none",
          background:
            "radial-gradient(circle at top right, rgba(255,255,255,0.08), transparent 28%), radial-gradient(circle at bottom left, rgba(34,197,94,0.08), transparent 24%)",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {branding.appLogoUrl ? (
            <img
              src={branding.appLogoUrl}
              alt="strikr"
              width={44}
              height={44}
              style={{
                width: 44,
                height: 44,
                objectFit: "contain",
                borderRadius: 12,
                display: "block",
              }}
            />
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 40,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-1px",
              color: "#ffffff",
            }}
          >
            {branding.appName}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 18px",
            borderRadius: 999,
            background: SHARE_THEME.soft,
            border: `1px solid ${SHARE_THEME.cardBorder}`,
            minHeight: 72,
            boxSizing: "border-box",
          }}
        >
          {branding.clubCrestUrl ? (
            <img
              src={branding.clubCrestUrl}
              alt={branding.clubName}
              width={44}
              height={44}
              style={{
                width: 44,
                height: 44,
                objectFit: "contain",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                display: "block",
              }}
            />
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 24,
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            {branding.clubName}
          </div>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {children}
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 22,
            color: SHARE_THEME.muted,
          }}
        >
          {branding.appTagline}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 20,
            color: SHARE_THEME.muted,
          }}
        >
          {branding.clubName}
        </div>
      </div>
    </div>
  );
}