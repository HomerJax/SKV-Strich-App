import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main style={{ padding: 40 }}>
      <h1>DEBUG HOME</h1>
      <pre>{JSON.stringify({ user }, null, 2)}</pre>
    </main>
  );
}