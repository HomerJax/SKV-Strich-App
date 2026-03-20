import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getCurrentMembership() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {}
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: membership, error } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id)
    .single();

  if (error || !membership) {
    return null;
  }

  return {
    userId: user.id,
    clubId: membership.club_id,
    role: membership.role as "admin" | "member",
  };
}