"use client";

import { useEffect, useState } from "react";

type Invite = {
  id: number;
  token: string;
};

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/invites");
        const json = await res.json();
        setInvites((json.invites || []) as Invite[]);
      } catch (err) {
        console.error("LOAD INVITES ERROR:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <div className="p-6">Lade Einladungen...</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Einladungen</h1>

      <div className="space-y-2">
        {invites.map((invite) => {
          const inviteUrl = `${getBaseUrl()}/join?token=${encodeURIComponent(
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