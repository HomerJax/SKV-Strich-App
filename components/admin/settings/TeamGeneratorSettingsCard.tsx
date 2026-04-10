import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";

export default async function TeamGeneratorSettingsCard() {
  const { clubId } = await requireClub();
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("club_settings")
    .select("use_strength, use_categories")
    .eq("club_id", clubId)
    .maybeSingle();

  return (
    <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm space-y-4">

      <h2 className="text-xl font-bold">Teamgenerator</h2>

      {/* ERKLÄRUNG */}
      <div className="text-sm text-slate-600 space-y-2">
        <p>
          Der Teamgenerator erstellt automatisch faire Teams.
        </p>

        <p>
          <strong>Kategorien</strong> (z. B. AH, Ü32) werden gleichmäßig verteilt.
        </p>

        <p>
          <strong>Stärke</strong> sorgt für ausgeglichene Teams.
        </p>

        <p>
          Wenn beides deaktiviert ist → zufällige Teams.
        </p>

        <p className="font-medium">
          Beispiel:
        </p>

        <p>
          10 Spieler:
          <br />
          4 AH, 6 Ü32
          <br />
          → beide Teams haben ähnliche Verteilung & Stärke
        </p>

        <p className="font-medium">
          Ziel: faire Teams ohne Diskussion.
        </p>
      </div>

      {/* SETTINGS */}
      <form method="post" action="/api/admin/settings" className="space-y-3">
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            name="use_categories"
            value="1"
            defaultChecked={settings?.use_categories ?? false}
          />
          Kategorien nutzen
        </label>

        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            name="use_strength"
            value="1"
            defaultChecked={settings?.use_strength ?? false}
          />
          Stärke nutzen
        </label>

        <button className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white">
          Speichern
        </button>
      </form>

    </div>
  );
}