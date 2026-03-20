import { SupabaseClient } from "@supabase/supabase-js";
import { AdminPlayer } from "@/lib/types/player";

export async function getAdminPlayersForClub(
  supabase: SupabaseClient,
  clubId: string
): Promise<AdminPlayer[]> {
  const { data, error } = await supabase
    .from("players")
    .select(
      "id, club_id, name, age_group, preferred_position, strength, is_active"
    )
    .eq("club_id", clubId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AdminPlayer[];
}