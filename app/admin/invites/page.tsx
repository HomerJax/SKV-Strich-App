import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function getBaseUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL;

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  return "";
}

export default async function InvitesPage() {
  const cookieStore = await cookies(); // ✅ FIX

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // read-only
        },
      },
    }
  );

  const { data: invites, error } = await supabase
    .from("invites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("INVITES ERROR:", error);
    return <div className="p-6">Fehler beim Laden der Einladungen</div>;
  }

  const baseUrl = getBaseUrl();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Einladungen</h1>

      <div className="space-y-2">
        {invites?.map((invite) => {
          const inviteUrl = `${baseUrl}/join?token=${encodeURIComponent(
            invite.token
          )}`;

          return (
            <div
              key={invite.id}
              className="flex items-center justify-between border p-3 rounded-lg"
            >
              <div className="text-sm break-all">{inviteUrl}</div>

              <button
                className="text-sm px-3 py-1 border rounded"
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                }}
              >
                Kopieren
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}