import { createClient } from "@/lib/supabase/server";

type Membership = {
  user_id: string;
  club_id: string;
  role: string;
};

export default async function MePage() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_my_membership");

  let membership: Membership | null = null;

  if (!error && data && data.length > 0) {
    membership = data[0] as Membership;
  }

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