import Image from "next/image";
import PlayerBadge from "@/components/badges/PlayerBadge";
import {
  getAchievementCustomAsset,
  getAchievementVisualTier,
} from "@/lib/badges/visual-catalog";

type AchievementBadgeVisualProps = {
  badgeKey: string;
  size?: "sm" | "md" | "lg" | "xl";
  grayscale?: boolean;
  className?: string;
};

const SIZE = {
  sm: 20,
  md: 24,
  lg: 36,
  xl: 72,
} as const;

export { getAchievementVisualTier } from "@/lib/badges/visual-catalog";

export default function AchievementBadgeVisual({
  badgeKey,
  size = "xl",
  grayscale = false,
  className = "",
}: AchievementBadgeVisualProps) {
  const customAsset = getAchievementCustomAsset(badgeKey);

  if (customAsset) {
    const px = SIZE[size];

    return (
      <span
        className={`relative inline-flex shrink-0 ${
          grayscale ? "grayscale opacity-45" : ""
        } ${className}`}
        style={{ width: px, height: px }}
        title={badgeKey}
        aria-label={badgeKey}
      >
        <Image
          src={customAsset}
          alt=""
          fill
          sizes={`${px}px`}
          className="object-contain"
          draggable={false}
        />
      </span>
    );
  }

  return (
    <PlayerBadge
      badgeKey={getAchievementVisualTier(badgeKey)}
      mode="hero"
      size={size}
      grayscale={grayscale}
      hideIfNone={false}
      className={className}
      title={badgeKey}
    />
  );
}
