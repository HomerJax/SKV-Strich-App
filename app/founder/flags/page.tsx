import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireFounder } from "@/lib/auth/founder";
import {
  ensureFeatureFlagRowsForClub,
  FEATURE_FLAG_DEFINITIONS,
  FEATURE_FLAG_KEYS,
  FeatureFlagKey,
  getFeatureFlagsForClub,
  setFeatureFlagForAllClubs,
  setFeatureFlagForClub,
} from "@/lib/feature-flags";

type ClubRow = {
  id: string;
  name: string | null;
  display_name: string | null;
  created_at: string | null;
};

type PageProps = {
  searchParams?: Promise<{
    club?: string;
    saved?: string;
  }>;
};

function getClubLabel(club: ClubRow) {
  return club.display_name?.trim() || club.name?.trim() || `Club ${club.id.slice(0, 8)}`;
}

function audienceLabel(audience: "players" | "internal" | "mixed") {
  if (audience === "players") return "Spieler";
  if (audience === "internal") return "Intern";
  return "Gemischt";
}

export default async function FounderFlagsPage({ searchParams }: PageProps) {
  await requireFounder();

  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedClubId = resolvedSearchParams.club ?? "";
  const saved = resolvedSearchParams.saved === "1";

  const supabase = await createClient();

  const { data: clubsData, error: clubsError } = await supabase
    .from("clubs")
    .select("id, name, display_name, created_at")
    .order("created_at", { ascending: true });

  if (clubsError) {
    throw new Error(`Clubs konnten nicht geladen werden: ${clubsError.message}`);
  }

  const clubs = (clubsData ?? []) as ClubRow[];

  const effectiveClubId =
    selectedClubId && clubs.some((club) => club.id === selectedClubId)
      ? selectedClubId
      : clubs[0]?.id ?? "";

  let flags = FEATURE_FLAG_KEYS.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {} as Record<FeatureFlagKey, boolean>);

  if (effectiveClubId) {
    await ensureFeatureFlagRowsForClub(effectiveClubId);
    flags = await getFeatureFlagsForClub(effectiveClubId);
  }

  async function toggleFlagAction(formData: FormData) {
    "use server";

    await requireFounder();

    const clubId = String(formData.get("club_id") ?? "").trim();
    const featureKeyRaw = String(formData.get("feature_key") ?? "").trim();
    const nextEnabled = formData.get("enabled") === "1";

    if (!clubId) {
      throw new Error("Kein Club ausgewählt.");
    }

    if (!FEATURE_FLAG_KEYS.includes(featureKeyRaw as FeatureFlagKey)) {
      throw new Error("Ungültiger Feature-Key.");
    }

    await setFeatureFlagForClub(
      clubId,
      featureKeyRaw as FeatureFlagKey,
      nextEnabled
    );

    revalidatePath("/founder/flags");
    revalidatePath("/founder");
  }

  async function toggleFlagForAllAction(formData: FormData) {
    "use server";

    await requireFounder();

    const featureKeyRaw = String(formData.get("feature_key") ?? "").trim();
    const nextEnabled = formData.get("enabled") === "1";

    if (!FEATURE_FLAG_KEYS.includes(featureKeyRaw as FeatureFlagKey)) {
      throw new Error("Ungültiger Feature-Key.");
    }

    await setFeatureFlagForAllClubs(
      featureKeyRaw as FeatureFlagKey,
      nextEnabled
    );

    revalidatePath("/founder/flags");
    revalidatePath("/founder");
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-20">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href="/founder"
          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
        >
          ← Zurück zum Founder Dashboard
        </Link>

        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
        >
          Zum Adminbereich
        </Link>
      </div>

      <div className="mb-6 rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Founder
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          Feature Flags pro Club
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Hier steuerst nur du, welche neuen Features in welchem Club sichtbar
          sind. Club-Admins bekommen diese Schalter nicht zu sehen. Perfekt für
          gestaffelte Releases, Pilot-Rollouts und kontrollierte Tests.
        </p>

        {saved ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Änderung gespeichert.
          </div>
        ) : null}
      </div>

      <div className="mb-6 rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-3 text-sm font-semibold text-slate-900">Club wählen</div>

        {clubs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Noch keine Clubs vorhanden.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {clubs.map((club) => {
              const active = club.id === effectiveClubId;

              return (
                <Link
                  key={club.id}
                  href={`/founder/flags?club=${encodeURIComponent(club.id)}`}
                  className={[
                    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-slate-950 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {getClubLabel(club)}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {effectiveClubId ? (
        <div className="space-y-4">
          {FEATURE_FLAG_DEFINITIONS.map((flag) => {
            const enabled = flags[flag.key];

            return (
              <section
                key={flag.key}
                className="rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold tracking-tight text-slate-950">
                          {flag.title}
                        </h2>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                          {flag.key}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                          {audienceLabel(flag.audience)}
                        </span>

                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            enabled
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700",
                          ].join(" ")}
                        >
                          {enabled ? "Im gewählten Club aktiv" : "Im gewählten Club inaktiv"}
                        </span>
                      </div>

                      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                        {flag.description}
                      </p>
                    </div>

                    <form action={toggleFlagAction} className="shrink-0">
                      <input type="hidden" name="club_id" value={effectiveClubId} />
                      <input type="hidden" name="feature_key" value={flag.key} />
                      <input
                        type="hidden"
                        name="enabled"
                        value={enabled ? "0" : "1"}
                      />

                      <button
                        type="submit"
                        className={[
                          "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                          enabled
                            ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                            : "bg-slate-950 text-white hover:bg-slate-800",
                        ].join(" ")}
                      >
                        {enabled
                          ? "Für diesen Club deaktivieren"
                          : "Für diesen Club aktivieren"}
                      </button>
                    </form>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <form action={toggleFlagForAllAction}>
                      <input type="hidden" name="feature_key" value={flag.key} />
                      <input type="hidden" name="enabled" value="1" />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Für alle Clubs aktivieren
                      </button>
                    </form>

                    <form action={toggleFlagForAllAction}>
                      <input type="hidden" name="feature_key" value={flag.key} />
                      <input type="hidden" name="enabled" value="0" />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Für alle Clubs deaktivieren
                      </button>
                    </form>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          Bitte zuerst einen Club anlegen.
        </div>
      )}
    </main>
  );
}