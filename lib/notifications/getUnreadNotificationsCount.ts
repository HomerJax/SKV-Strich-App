import { createClient } from "@/lib/supabase/server";

export async function getUnreadNotificationCount(userId: string) {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("user_notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("seen_at", null);

  if (error) {
    throw new Error(`Failed to load unread notification count: ${error.message}`);
  }

  return count ?? 0;
}