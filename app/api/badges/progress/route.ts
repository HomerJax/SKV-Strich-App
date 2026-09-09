import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { getPlayerBadgeProgress } from "@/lib/badges/progress";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getAuthContext();

    if (!ctx.user || !ctx.activeClubId || !ctx.player?.id) {
      return NextResponse.json({ enabled: false, items: [] }, { status: 200 });
    }

    const flags = await getFeatureFlagsForClub(ctx.activeClubId);
    if (!flags.hall_of_fame_badges) {
      return NextResponse.json({ enabled: false, items: [] }, { status: 200 });
    }

    const progress = await getPlayerBadgeProgress(
      ctx.activeClubId,
      Number(ctx.player.id),
    );

    return NextResponse.json({
      enabled: true,
      ...progress,
    });
  } catch (error) {
    console.error("badge progress api failed", error);
    return NextResponse.json({ enabled: false, items: [] }, { status: 200 });
  }
}
