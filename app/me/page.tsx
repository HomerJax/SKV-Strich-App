"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Membership = {
  user_id: string;
  club_id: string;
  role: string;
};

export default function MePage() {
  const [membership, setMembership] = useState<Membership | null>(null);

  useEffect(() => {
    async function loadMembership() {
      const { data, error } = await supabase.rpc("get_my_membership");

      if (!error && data && data.length > 0) {
        setMembership(data[0]);
      }
    }

    loadMembership();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Meine Membership</h1>

      {membership ? (
        <div className="rounded border p-4">
          <p><b>User ID:</b> {membership.user_id}</p>
          <p><b>Club ID:</b> {membership.club_id}</p>
          <p><b>Role:</b> {membership.role}</p>
        </div>
      ) : (
        <p>Keine Daten gefunden</p>
      )}
    </div>
  );
}