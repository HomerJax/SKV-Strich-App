import "server-only";

import { createClient } from "@supabase/supabase-js";

export type FounderAuthUser = {
  id: string;
  email: string | null;
  created_at: string | null;
};

function getFounderAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Founder Admin Client konnte nicht erstellt werden: fehlende Supabase ENV Variablen."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function listAllAuthUsers(): Promise<FounderAuthUser[]> {
  const supabase = getFounderAdminClient();

  const allUsers: FounderAuthUser[] = [];
  const perPage = 200;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Auth-User konnten nicht geladen werden: ${error.message}`);
    }

    const users = (data?.users ?? []).map((user) => ({
      id: user.id,
      email: user.email ?? null,
      created_at: user.created_at ?? null,
    }));

    allUsers.push(...users);

    if (users.length < perPage) {
      break;
    }

    page += 1;

    if (page > 100) {
      break;
    }
  }

  return allUsers;
}