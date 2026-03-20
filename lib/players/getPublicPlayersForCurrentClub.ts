import { SupabaseClient } from "@supabase/supabase-js";
import { PublicPlayer } from "@/lib/types/player";

export async function getPublicPlayersForCurrentClub(
  supabase: SupabaseClient
): Promise<PublicPlayer[]> {
  const { data, error } = await supabase.rpc("get_players_public");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PublicPlayer[];
}