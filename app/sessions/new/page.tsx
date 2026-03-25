import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";

type NewSessionPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function getTodayIsoDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function NewSessionPage({
  searchParams,
}: NewSessionPageProps) {
  await requireClub();
  const resolvedSearchParams = await searchParams;
  const initialDate = getTodayIsoDate();
  const errorMessage = resolvedSearchParams?.error ?? "";

  async function createSessionAction(formData: FormData) {
    "use server";

    const { clubId } = await requireClub();
    const supabase = await createClient();

    const date = String(formData.get("date") ?? "").trim();
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const notes = notesRaw === "" ? null : notesRaw;

    if (!date) {
      redirect("/sessions/new?error=Bitte%20Datum%20ausw%C3%A4hlen.");
    }

    const { data: season, error: seasonErr } = await supabase
      .from("seasons")
      .select("id, start_date, end_date")
      .eq("club_id", clubId)
      .lte("start_date", date)
      .gte("end_date", date)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (seasonErr) {
      redirect(
        `/sessions/new?error=${encodeURIComponent(
          `Saison konnte nicht geladen werden: ${seasonErr.message}`
        )}`
      );
    }

    const { data: created, error: insertError } = await supabase
      .from("sessions")
      .insert({
        date,
        notes,
        season_id: season?.id ?? null,
        club_id: clubId,
      })
      .select("id")
      .single();

    if (insertError) {
      redirect(
        `/sessions/new?error=${encodeURIComponent(
          insertError.message || "Fehler beim Speichern."
        )}`
      );
    }

    redirect(`/sessions/${created.id}`);
  }

  return (
    <div className="space-y-4">
      <Link
        href="/sessions"
        className="text-xs text-slate-500 hover:text-slate-700"
      >
        ← Zurück zu Trainings
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-slate-900">Neues Training</h1>
        <p className="text-xs text-slate-500">
          Saison wird automatisch über das Datum erkannt.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-xs font-semibold text-slate-700">Hinweis</div>
        <div className="mt-1 text-sm text-slate-600">
          Falls das Datum in keinen Saisonzeitraum fällt, wird das Training
          trotzdem erstellt und zunächst ohne Saison gespeichert.
        </div>
      </div>

      <form
        action={createSessionAction}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <label className="block">
          <div className="mb-1 text-xs font-semibold text-slate-700">Datum</div>
          <input
            name="date"
            type="date"
            defaultValue={initialDate}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            required
          />
        </label>

        <label className="block">
          <div className="mb-1 text-xs font-semibold text-slate-700">Notiz</div>
          <input
            name="notes"
            placeholder="optional, z. B. Flutlicht oder Hallentraining"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          Training anlegen
        </button>
      </form>
    </div>
  );
}