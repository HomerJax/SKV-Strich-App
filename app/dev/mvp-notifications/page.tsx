import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SearchParams = Promise<{
  sessionId?: string;
  success?: string;
  error?: string;
}>;

type DevMvpNotificationsPageProps = {
  searchParams?: SearchParams;
};

async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return user;
}

async function assertDevAccess(userId: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("user_roles")
    .select("is_power_user")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.is_power_user !== true) {
    redirect("/home");
  }
}

async function createTestNotification(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  await assertDevAccess(user.id);

  const sessionId = Number(formData.get("sessionId"));
  const variant = String(formData.get("variant"));

  if (!Number.isFinite(sessionId)) {
    redirect("/dev/mvp-notifications?error=missing-session");
  }

  const admin = createAdminClient();

  const { data: session, error: sessionError } = await admin
    .from("sessions")
    .select("id, club_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError || !session) {
    redirect("/dev/mvp-notifications?error=session-not-found");
  }

  const isWinner = variant === "winner";
  const type = isWinner ? "mvp_winner" : "mvp_result";
  const shareVariant = isWinner ? "winner" : "team";

  const { error } = await admin.from("user_notifications").insert({
    user_id: user.id,
    club_id: session.club_id,
    type,
    title: isWinner
      ? "Du wurdest zum MVP gewählt."
      : "Marcello wurde MVP.",
    body: isWinner
      ? "Starker Auftritt. Teile deine MVP Card."
      : "Das MVP Voting ist beendet. Schau dir das Ergebnis an.",
    cta_href: isWinner
      ? `/sessions/${sessionId}?share=mvp`
      : `/sessions/${sessionId}?mvp=result`,
    cta_label: isWinner ? "Teilen" : "Ergebnis ansehen",
    seen_at: null,
    payload: {
      dev: true,
      sessionId,
      clubId: session.club_id,
      winnerPlayerId: null,
      winnerName: isWinner ? "Du" : "Marcello",
      viewerPlayerId: null,
      isWinner,
      shareVariant,
      shareImageUrl: `/api/share/mvp/${sessionId}/image?variant=${shareVariant}`,
      sessionHref: `/sessions/${sessionId}`,
      leaderboard: [
        {
          playerId: 1,
          name: "Marcello",
          votes: 5,
          mvpCount: 4,
        },
        {
          playerId: 2,
          name: "Timo",
          votes: 3,
          mvpCount: 2,
        },
      ],
      winners: [
        {
          playerId: 1,
          name: "Marcello",
          votes: 5,
          mvpCount: 5,
        },
      ],
      badgeUpgrade: {
        playerId: 1,
        playerName: "Marcello",
        previousMvpCount: 4,
        newMvpCount: 5,
      },
      totalVotes: 8,
    },
  });

  if (error) {
    redirect(`/dev/mvp-notifications?sessionId=${sessionId}&error=insert`);
  }

  revalidatePath("/home");
  redirect(`/dev/mvp-notifications?sessionId=${sessionId}&success=${type}`);
}

async function markOwnNotificationsUnseen() {
  "use server";

  const user = await getCurrentUser();
  await assertDevAccess(user.id);

  const admin = createAdminClient();

  await admin
    .from("user_notifications")
    .update({
      seen_at: null,
      read_at: null,
    })
    .eq("user_id", user.id)
    .in("type", ["mvp_winner", "mvp_result"]);

  revalidatePath("/home");
  redirect("/dev/mvp-notifications?success=unseen");
}

async function deleteOwnMvpNotifications() {
  "use server";

  const user = await getCurrentUser();
  await assertDevAccess(user.id);

  const admin = createAdminClient();

  await admin
    .from("user_notifications")
    .delete()
    .eq("user_id", user.id)
    .in("type", ["mvp_winner", "mvp_result"]);

  revalidatePath("/home");
  redirect("/dev/mvp-notifications?success=deleted");
}

export default async function DevMvpNotificationsPage({
  searchParams,
}: DevMvpNotificationsPageProps) {
  const user = await getCurrentUser();
  await assertDevAccess(user.id);

  const params = await searchParams;
  const sessionId = params?.sessionId ?? "";

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          strikr dev
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-neutral-950">
          MVP Notifications testen
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Erzeugt Test-Notifications für deinen User, ohne ein komplettes
          Training zu simulieren.
        </p>
      </div>

      {params?.success ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Erfolgreich: {params.success}
        </div>
      ) : null}

      {params?.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Fehler: {params.error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <form action={createTestNotification} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-neutral-900">
              Session-ID
            </label>
            <input
              name="sessionId"
              defaultValue={sessionId}
              placeholder="z.B. 251"
              className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              name="variant"
              value="winner"
              className="rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-bold text-white"
            >
              Winner Notification
            </button>

            <button
              name="variant"
              value="team"
              className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-bold text-neutral-900"
            >
              Team Notification
            </button>
          </div>
        </form>
      </div>

      <form action={markOwnNotificationsUnseen}>
        <button className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-bold text-neutral-900">
          Meine MVP Notifications wieder sichtbar machen
        </button>
      </form>

      <form action={deleteOwnMvpNotifications}>
        <button className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          Meine MVP Test-Notifications löschen
        </button>
      </form>

      <div className="rounded-3xl bg-neutral-950 p-5 text-sm text-neutral-300">
        <p className="font-semibold text-white">Testablauf:</p>
        <p className="mt-2">
          1. Session-ID eintragen. 2. Winner oder Team Notification erzeugen.
          3. Zur Home wechseln. Der Toast sollte direkt erscheinen.
        </p>
      </div>
    </main>
  );
}