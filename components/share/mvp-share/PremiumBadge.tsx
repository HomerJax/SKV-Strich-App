/* eslint-disable @next/next/no-img-element */

type PremiumBadgeProps = {
  badgeImageUrl?: string | null;
  fallbackLabel?: string;
  size?: number;
  glowColor?: string;
  glowStrength?: number;
  imageFilter?: string;
};

export default function PremiumBadge({
  badgeImageUrl,
  fallbackLabel = "MVP",
  size = 650,
  glowColor = "rgba(255,220,120,0.45)",
  glowStrength = 1,
  imageFilter,
}: PremiumBadgeProps) {
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: size * 0.95,
          height: size * 0.52,
          borderRadius: "999px",
          background: glowColor,
          opacity: 0.58 * glowStrength,
          filter: "blur(96px)",
          transform: "rotate(-10deg)",
        }}
      />

      <div
        style={{
          position: "absolute",
          width: size * 0.6,
          height: size * 0.38,
          borderRadius: "999px",
          background: "rgba(255,255,255,0.18)",
          opacity: 0.32 * glowStrength,
          filter: "blur(72px)",
          transform: "translateY(42px) rotate(-8deg)",
        }}
      />

      <div
        style={{
          display: "flex",
          position: "relative",
          width: size * 0.58,
          height: size * 0.68,
          borderRadius: size * 0.12,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          background:
            "linear-gradient(145deg, #18181b 0%, #52525b 45%, #09090b 100%)",
          border: `${Math.max(8, size * 0.026)}px solid rgba(255,255,255,0.42)`,
          boxShadow:
            "0 52px 90px rgba(0,0,0,0.66), inset 0 2px 0 rgba(255,255,255,0.28), inset 0 -18px 40px rgba(0,0,0,0.42)",
          color: "#ffffff",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: size * 0.15,
            fontWeight: 900,
            letterSpacing: -size * 0.008,
            lineHeight: 1,
          }}
        >
          MVP
        </div>
        <div
          style={{
            display: "flex",
            marginTop: size * 0.035,
            fontSize: size * 0.07,
            fontWeight: 900,
            letterSpacing: size * 0.008,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.72)",
          }}
        >
          {fallbackLabel}
        </div>
      </div>

      {badgeImageUrl ? (
        <img
          src={badgeImageUrl}
          alt=""
          width={size}
          height={size}
          style={{
            width: size,
            height: size,
            objectFit: "contain",
            position: "absolute",
            inset: 0,
            filter:
              imageFilter ??
              "drop-shadow(0 52px 90px rgba(0,0,0,0.66)) drop-shadow(0 0 34px rgba(255,255,255,0.18))",
          }}
        />
      ) : null}
    </div>
  );
}
