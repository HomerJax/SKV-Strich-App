import { createClient } from "@/lib/supabase/server";

export async function createSignedPhotoUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null | undefined
) {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from("session-photos")
    .createSignedUrl(path, 60 * 60);

  if (error) return null;
  return data?.signedUrl ?? null;
}