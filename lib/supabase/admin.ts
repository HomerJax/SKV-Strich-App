import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdminEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Admin Supabase Client konnte nicht erstellt werden: fehlende ENV Variablen."
    );
  }

  return { url, serviceRoleKey };
}

export function createAdminClient() {
  const { url, serviceRoleKey } = getAdminEnv();

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const adminClient = createAdminClient();