import { NextResponse } from "next/server";
import { canManageClub } from "@/lib/auth/access";
import { requireClub } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

type ChatMessageRow = {
  id: number;
  club_id: string;
  user_id: string;
  player_id: number | null;
  author_name: string;
  body: string;
  created_at: string;
};

function authorName(params: {
  player:
    | {
        first_name?: string | null;
        last_name?: string | null;
        nickname?: string | null;
      }
    | null;
  email?: string | null;
  fallback: string;
}) {
  const nickname = params.player?.nickname?.trim();
  if (nickname) return nickname;

  const fullName = [
    params.player?.first_name?.trim(),
    params.player?.last_name?.trim(),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    params.email?.split("@")[0]?.trim() ||
    params.fallback
  ).slice(0, 80);
}

async function requireTeamChat(clubId: string) {
  const flags = await getFeatureFlagsForClub(clubId);
  return flags.team_chat === true;
}

async function listMessages(clubId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("club_chat_messages")
    .select("id,club_id,user_id,player_id,author_name,body,created_at")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ChatMessageRow[]).reverse();
}

export async function GET() {
  const { t } = await getServerI18n();
  const { clubId } = await requireClub();
  if (!(await requireTeamChat(clubId))) {
    return NextResponse.json({ error: t("chatApi.disabled") }, { status: 403 });
  }

  try {
    const messages = await listMessages(clubId);
    return NextResponse.json(
      { messages },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Team chat load failed", error);
    return NextResponse.json(
      { error: t("chatApi.loadFailed") },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { t } = await getServerI18n();
  const { clubId, user, player } = await requireClub();
  if (!(await requireTeamChat(clubId))) {
    return NextResponse.json({ error: t("chatApi.disabled") }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { body?: unknown }
    | null;
  const body = String(payload?.body ?? "").trim();

  if (!body) {
    return NextResponse.json(
      { error: t("chatApi.bodyRequired") },
      { status: 400 },
    );
  }

  if (body.length > 500) {
    return NextResponse.json(
      { error: t("chatApi.bodyTooLong") },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("club_chat_messages")
    .insert({
      club_id: clubId,
      user_id: user.id,
      player_id: player?.id ?? null,
      author_name: authorName({ player, email: user.email, fallback: t("chatApi.playerFallback") }),
      body,
    })
    .select("id,club_id,user_id,player_id,author_name,body,created_at")
    .single<ChatMessageRow>();

  if (error || !data) {
    console.error("Team chat send failed", error);
    return NextResponse.json(
      { error: t("chatApi.sendFailed") },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { t } = await getServerI18n();
  const { clubId, user, membership, isPowerUser } = await requireClub();
  if (!(await requireTeamChat(clubId))) {
    return NextResponse.json({ error: t("chatApi.disabled") }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { id?: unknown }
    | null;
  const messageId = Number(payload?.id);

  if (!Number.isInteger(messageId) || messageId < 1) {
    return NextResponse.json(
      { error: t("chatApi.invalidMessage") },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: message, error: loadError } = await admin
    .from("club_chat_messages")
    .select("id,user_id")
    .eq("club_id", clubId)
    .eq("id", messageId)
    .maybeSingle<{ id: number; user_id: string }>();

  if (loadError) {
    return NextResponse.json(
      { error: t("chatApi.checkFailed") },
      { status: 500 },
    );
  }

  if (!message) {
    return NextResponse.json({ ok: true });
  }

  const canDelete =
    message.user_id === user.id ||
    canManageClub({ isPowerUser, role: membership.role });

  if (!canDelete) {
    return NextResponse.json(
      { error: t("chatApi.deleteForbidden") },
      { status: 403 },
    );
  }

  const { error } = await admin
    .from("club_chat_messages")
    .delete()
    .eq("club_id", clubId)
    .eq("id", messageId);

  if (error) {
    console.error("Team chat delete failed", error);
    return NextResponse.json(
      { error: t("chatApi.deleteFailed") },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
