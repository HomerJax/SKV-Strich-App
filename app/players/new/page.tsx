import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";

type PreferredPosition = "defense" | "attack" | "goalkeeper" | null;
type AgeGroup = "AH" | "Ü32" | null;

function clean(value: string) {
  return value.trim();
}

function buildLegacyName({
  firstName,
  lastName,
  nickname,
}: {
  firstName: string;
  lastName: string;
  nickname: string;
}) {
  if (nickname) return nickname;

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;

  return "";
}

type PageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function NewPlayerPage({ searchParams }: PageProps) {
  await requireClub();
  const resolvedSearchParams = await searchParams;
  const errorMsg = resolvedSearchParams?.error ?? "";

  async function createPlayerAction(formData: FormData) {
    "use server";

    const { clubId } = await requireClub();
    const supabase = await createClient();

    const firstName = clean(String(formData.get("first_name") ?? ""));
    const lastName = clean(String(formData.get("last_name") ?? ""));
    const nickname = clean(String(formData.get("nickname") ?? ""));
    const ageGroup = (String(formData.get("age_group") ?? "") || "AH") as AgeGroup;
    const position = (String(
      formData.get("preferred_position") ?? ""
    ) || "attack") as PreferredPosition;

    if (!nickname && !firstName && !lastName) {
      redirect(
        "/players/new?error=Bitte%20mindestens%20Spitzname%20oder%20Vorname/Nachname%20eingeben."
      );
    }

    const legacyName = buildLegacyName({
      firstName,
      lastName,
      nickname,
    });

    if (!legacyName) {
      redirect("/players/new?error=Der%20Spielername%20konnte%20nicht%20erstellt%20werden.");
    }

    const { error } = await supabase.from("players").insert({
      name: legacyName,
      first_name: firstName || null,
      last_name: lastName || null,
      nickname: nickname || null,
      age_group: ageGroup,
      preferred_position: position,
      club_id: clubId,
      is_active: true,
      strength: null,
    });

    if (error) {
      redirect(`/players/new?error=${encodeURIComponent(error.message)}`);
    }

    redirect("/players");
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-6">
      <div className="space-y-1">
        <Link
          href="/players"
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          ← Zurück zur Übersicht
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Neuen Spieler anlegen
        </h1>
        <p className="text-sm text-slate-500">
          Anzeige in der App: Spitzname, sonst Vorname + Nachname.
        </p>
      </div>

      <form
        action={createPlayerAction}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Vorname
            </label>
            <input
              name="first_name"
              type="text"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Nachname
            </label>
            <input
              name="last_name"
              type="text"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Spitzname (optional)
          </label>
          <input
            name="nickname"
            type="text"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-400"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Altersgruppe
            </label>
            <select
              name="age_group"
              defaultValue="AH"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="AH">AH</option>
              <option value="Ü32">Ü32</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Position
            </label>
            <select
              name="preferred_position"
              defaultValue="attack"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="defense">Hinten (Abwehr)</option>
              <option value="attack">Vorne (Angriff)</option>
              <option value="goalkeeper">Torwart</option>
            </select>
          </div>
        </div>

        {errorMsg ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMsg}
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Spieler anlegen
          </button>

          <Link
            href="/players"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}