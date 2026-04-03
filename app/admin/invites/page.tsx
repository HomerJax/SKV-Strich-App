import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

function getBaseUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL;

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  // ⚠️ wichtig: KEIN localhost für echte User
  // fallback leer → relative URLs funktionieren im Browser
  return "";
}

export default async function InvitesPage() {
  const supabase = await createServerClient();

  const { data: invites } = await supabase
    .from("invites")
    .select("*")
    .order("created_at", { ascending: false });

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

              <Button
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                }}
              >
                Kopieren
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}