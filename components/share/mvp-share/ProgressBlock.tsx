export default function ProgressBlock({
  previous,
  current,
  earnedBadgeText,
}: {
  previous: number;
  current: number;
  earnedBadgeText: string;
}) {
  return (
    <div
      style={{
        padding: 30,
        borderRadius: 28,
        background: "rgba(255,255,255,0.1)",
      }}
    >
      <div style={{ fontSize: 20, opacity: 0.6 }}>MVP Fortschritt</div>

      <div style={{ fontSize: 50, fontWeight: 900 }}>
        {previous} → {current}
      </div>

      <div style={{ marginTop: 10, fontWeight: 900 }}>
        {earnedBadgeText}
      </div>
    </div>
  );
}