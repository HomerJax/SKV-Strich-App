import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";

function formatDate(date: string | null) {
  if (!date) return "nicht gesetzt";
  return new Date(date).toLocaleDateString("de-DE");
}

export default async function SeasonSettingsCard() {
  const { clubId } = await requireClub();
  const supabase = await createClient();

  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, name, start_date, end_date")
    .eq("club_id", clubId)
    .order("start_date", { ascending: false });

  return (
    <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm space-y-5">

      <h2 className="text-xl font-bold">Saison</h2>

      {/* CREATE */}
      <form
        method="post"
        action="/api/admin/seasons"
        className="space-y-3 rounded-xl border border-black/10 bg-neutral-50 p-4"
      >
        <input type="hidden" name="intent" value="create" />

        <input
          name="name"
          placeholder="Saison 2025/26"
          className="w-full rounded-xl border px-3 py-2 text-sm"
          required
        />

        <div className="grid grid-cols-2 gap-2">
          <input type="date" name="start_date" required className="rounded-xl border px-2 py-2 text-sm" />
          <input type="date" name="end_date" required className="rounded-xl border px-2 py-2 text-sm" />
        </div>

        <button className="rounded-xl bg-black px-4 py-2 text-sm text-white font-semibold">
          Anlegen
        </button>
      </form>

      {/* LIST */}
      <div className="space-y-2">
        {seasons?.map((s) => (
          <div key={s.id} className="flex justify-between rounded-xl border px-3 py-3">

            <div>
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-slate-500">
                {formatDate(s.start_date)} → {formatDate(s.end_date)}
              </div>
            </div>

            <form method="post" action="/api/admin/seasons">
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="season_id" value={s.id} />
              <button className="text-red-600 text-sm">
                Löschen
              </button>
            </form>

          </div>
        ))}
      </div>

    </div>
  );
}