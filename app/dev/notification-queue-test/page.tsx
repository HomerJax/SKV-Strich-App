import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertNotProduction } from "@/lib/safety/assertions";

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
  assertNotProduction("Access notification queue test page");

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

async function createQueueTestNotifications() {
  "use server";

  assertNotProduction("Create notification queue test notifications");

  const user = await getCurrentUser();
  await assertDevAccess(user.id);

  const admin = createAdminClient();

  await admin
    .from("user_notifications")
    .delete()
    .eq("user_id", user.id)
    .eq("type", "dev_toast_test");

  const { error } = await admin.from("user_notifications").insert([
    {
      user_id: user.id,
      club_id: null,
      type: "dev_toast_test",
      title: "Toast Test 1",
      body: "Erste von drei Test-Benachrichtigungen.",
      cta_href: null,
      cta_label: null,
      seen_at: null,
      payload: { dev: true, toastQueueTest: true, order: 1 },
    },
    {
      user_id: user.id,
      club_id: null,
      type: "dev_toast_test",
      title: "Toast Test 2",
      body: "Zweite von drei Test-Benachrichtigungen.",
      cta_href: null,
      cta_label: null,
      seen_at: null,
      payload: { dev: true, toastQueueTest: true, order: 2 },
    },
    {
      user_id: user.id,
      club_id: null,
      type: "dev_toast_test",
      title: "Toast Test 3",
      body: "Dritte von drei Test-Benachrichtigungen.",
      cta_href: null,
      cta_label: null,
      seen_at: null,
      payload: { dev: true, toastQueueTest: true, order: 3 },
    },
  ]);

  if (error) {
    redirect("/dev/notification-queue-test?error=insert");
  }

  revalidatePath("/home");
  redirect("/dev/notification-queue-test?success=created");
}

async function deleteQueueTestNotifications() {
  "use server";

  assertNotProduction("Delete notification queue test notifications");

  const user = await getCurrentUser();
  await assertDevAccess(user.id);

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_notifications")
    .delete()
    .eq("user_id", user.id)
    .eq("type", "dev_toast_test");

  if (error) {
    redirect("/dev/notification-queue-test?error=delete");
  }

  revalidatePath("/home");
  redirect("/dev/notification-queue-test?success=deleted");
}

type PageProps = {
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function NotificationQueueTestPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  await assertDevAccess(user.id);
  const params = await searchParams;

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          strikr dev
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-neutral-950">
          Notification Queue testen
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Erzeugt drei neutrale Test-Notifications. Keine Session nötig.
        </p>
      </div>

      {params?.success === "created" ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Drei Test-Notifications wurden erzeugt. Jetzt Home öffnen.
        </div>
      ) : null}

      {params?.success === "deleted" ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Test-Notifications wurden gelöscht.
        </div>
      ) : null}

      {params?.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Fehler: {params.error}
        </div>
      ) : null}

      <form action={createQueueTestNotifications}>
        <button className="w-full rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-bold text-white">
          3 Test-Notifications erzeugen
        </button>
      </form>

      <form action={deleteQueueTestNotifications}>
        <button className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          Test-Notifications löschen
        </button>
      </form>

      <div className="rounded-3xl bg-neutral-950 p-5 text-sm text-neutral-300">
        <p className="font-semibold text-white">Erwartung auf Home:</p>
        <p className="mt-2">
          Nur ein Toast gleichzeitig. Erst „Noch 2“, danach „Noch 1“, dann der letzte Toast.
        </p>
      </div>
    </main>
  );
}
