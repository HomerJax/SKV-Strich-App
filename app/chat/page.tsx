import Link from "next/link";
import { canManageClub } from "@/lib/auth/access";
import { requireClub } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import ChatClient, { type ChatMessage } from "./ChatClient";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const { clubId, user, membership, isPowerUser } = await requireClub();
  const admin = createAdminClient();

  const [{ data: messagesData }, { data: clubData }] = await Promise.all([
    admin
      .from("club_chat_messages")
      .select("id,club_id,user_id,player_id,author_name,body,created_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(100),
    admin
      .from("clubs")
      .select("display_name,name")
      .eq("id", clubId)
      .maybeSingle<{ display_name: string | null; name: string | null }>(),
  ]);

  const initialMessages = ((messagesData ?? []) as ChatMessage[]).reverse();
  const clubName =
    clubData?.display_name?.trim() ||
    clubData?.name?.trim() ||
    "Dein Team";
  const canManage = canManageClub({
    isPowerUser,
    role: membership.role,
  });

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto w-full max-w-4xl px-3 py-4 pb-24 sm:px-5">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <Link
            href="/home"
            className="text-sm font-semibold text-slate-600"
          >
            ← Home
          </Link>
          <div className="min-w-0 text-right">
            <div className="truncate text-sm font-black text-slate-950">
              {clubName}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-slate-400">
              strikr Teamchat
            </div>
          </div>
        </div>

        <ChatClient
          initialMessages={initialMessages}
          currentUserId={user.id}
          canManage={canManage}
        />
      </section>
    </main>
  );
}
