import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import { canManageClub } from "@/lib/auth/access";

type ClubRow = {
  id: string;
  display_name: string | null;
  logo_path: string | null;
  primary_color: string | null;
  name: string | null;
};

type ClubAdminPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
    club_delete_error?: string;
  }>;
};

const COLOR_OPTIONS = [
  { value: "black", label: "Schwarz", color: "#020617" },
  { value: "blue", label: "Blau", color: "#1d4ed8" },
  { value: "red", label: "Rot", color: "#dc2626" },
  { value: "green", label: "Grün", color: "#16a34a" },
] as const;

function getClubDeleteErrorMessage(error?: string) {
  switch (error) {
    case "confirmation":
      return 'Bitte gib exakt „CLUB LÖSCHEN“ ein und bestätige die Checkbox.';
    case "unauthorized":
      return "Nur ein echter Club-Admin darf den Club dauerhaft löschen.";
    case "delete_failed":
      return "Der Club konnte nicht vollständig gelöscht werden. Bitte versuche es erneut.";
    default:
      return "";
  }
}

function getErrorMessage(error?: string) {
  switch (error) {
    case "unauthorized":
      return "Du hast keinen Zugriff auf diesen Bereich.";
    case "missing_club":
      return "Es konnte kein Club gefunden werden.";
    case "invalid_file":
      return "Bitte lade nur PNG, JPG, JPEG oder WEBP hoch.";
    case "file_too_large":
      return "Die Datei ist zu groß. Maximal 2 MB sind erlaubt.";
    case "save_failed":
      return "Die Änderungen konnten nicht gespeichert werden.";
    case "remove_failed":
      return "Das Logo konnte nicht entfernt werden.";
    default:
      return "";
  }
}

export default async function ClubAdminPage({
  searchParams,
}: ClubAdminPageProps) {
  const resolvedSearchParams = await searchParams;
  const { clubId, membership, memberships, isPowerUser } = await requireClub();

  const hasAdminAccess = canManageClub({
    isPowerUser,
    role: membership.role,
  });

  if (!hasAdminAccess) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto w-full max-w-3xl px-4 py-6">
          <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
              Kein Zugriff
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Dieser Bereich ist nur für Admins des aktuell ausgewählten Teams
              verfügbar.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/"
                className="inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Zur Startseite
              </Link>
              {memberships.length > 1 ? (
                <Link
                  href={AUTH_ROUTES.selectClub}
                  className="inline-flex rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900"
                >
                  Team wechseln
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    );
  }

  const supabase = await createClient();

  const [{ data: clubData, error: clubError }, flags] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, display_name, logo_path, primary_color, name")
      .eq("id", clubId)
      .maybeSingle(),
    getFeatureFlagsForClub(clubId),
  ]);

  if (clubError) {
    throw new Error(clubError.message);
  }

  const club = (clubData as ClubRow | null) ?? null;

  if (!club) {
    redirect(`${AUTH_ROUTES.admin}?error=missing_club`);
  }

  let logoUrl: string | null = null;

  if (club.logo_path) {
    const { data } = supabase.storage
      .from("club-logos")
      .getPublicUrl(club.logo_path);

    logoUrl = data.publicUrl;
  }

  const selectedColor = club.primary_color ?? "black";
  const previewColor =
    COLOR_OPTIONS.find((option) => option.value === selectedColor)?.color ??
    "#020617";

  const errorMessage = getErrorMessage(resolvedSearchParams?.error);
  const saved = resolvedSearchParams?.saved === "1";
  const clubDeleteError = getClubDeleteErrorMessage(
    resolvedSearchParams?.club_delete_error
  );
  const useNicknames = flags.use_nicknames ?? false;
  const canDeleteClub = membership.role === "admin";
  const clubLabel = club.display_name?.trim() || club.name?.trim() || "dieser Club";

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
        <div className="flex items-center">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Adminbereich
          </Link>
        </div>

        <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <div className="text-sm font-semibold text-slate-500">Admin</div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
              Club, Branding & allgemeine Einstellungen
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Hier pflegst du Namen, Logo, Farbe und grundlegende Anzeigeoptionen
              für euren Club.
            </p>

            {isPowerUser ? (
              <div className="mt-4 inline-flex rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-900">
                Power User Modus: Du prüfst diesen Verein ohne echte
                Mitgliedschaft.
              </div>
            ) : null}
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {errorMessage}
            </div>
          ) : null}

          {saved ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Änderungen gespeichert.
            </div>
          ) : null}

          <div className="mb-6 rounded-[20px] border border-black/10 bg-neutral-50 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-500">
              Aktuelle Vorschau
            </div>

            <div
              className="rounded-2xl border border-slate-200 bg-white p-4"
              style={{ borderTop: `4px solid ${previewColor}` }}
            >
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm">
                    <Image
                      src={logoUrl}
                      alt={club.display_name || "Clublogo"}
                      width={80}
                      height={80}
                      unoptimized
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white text-xs font-semibold text-neutral-400">
                    Logo
                  </div>
                )}

                <div className="min-w-0">
                  <div className="truncate text-lg font-bold text-slate-950">
                    {club.display_name?.trim() || "Dein Team"}
                  </div>
                  <div className="text-sm text-slate-500">
                    Anzeige im Header
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Spielernamen:{" "}
                    <span className="font-semibold text-slate-700">
                      {useNicknames ? "Spitznamen aktiv" : "Vor- und Nachname"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <form
            method="post"
            action="/api/admin/club"
            encType="multipart/form-data"
            className="space-y-5"
          >
            <div className="space-y-2">
              <label
                htmlFor="display_name"
                className="block text-sm font-medium text-slate-900"
              >
                Vereinsname
              </label>
              <input
                id="display_name"
                name="display_name"
                type="text"
                maxLength={80}
                defaultValue={club.display_name ?? ""}
                placeholder="z. B. SKV Rutesheim"
                className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="logo"
                className="block text-sm font-medium text-slate-900"
              >
                Vereinslogo
              </label>
              <input
                id="logo"
                name="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
              />
              <p className="text-xs text-slate-500">
                Erlaubt: PNG, JPG, JPEG, WEBP · maximal 2 MB
              </p>
            </div>

            <div className="space-y-2">
              <div className="block text-sm font-medium text-slate-900">
                Vereinsfarbe
              </div>

              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-900 transition hover:border-slate-900/20"
                  >
                    <input
                      type="radio"
                      name="primary_color"
                      value={option.value}
                      defaultChecked={option.value === selectedColor}
                    />
                    <span
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ backgroundColor: option.color }}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>

              <p className="text-xs text-slate-500">
                Die Farbe wird als dezenter Akzent für euren Club in der App
                genutzt.
              </p>
            </div>

            <div className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
              <div className="mb-3 text-sm font-semibold text-slate-500">
                Allgemeine Anzeige
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
                <input
                  type="checkbox"
                  name="use_nicknames"
                  value="1"
                  defaultChecked={useNicknames}
                  className="mt-1 h-4 w-4 rounded border-neutral-300"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-950">
                    Spitznamen anzeigen
                  </div>
                  <div className="text-sm text-slate-600">
                    Wenn aktiv, werden Spieler in Sessions, Teams, Stats und
                    weiteren Ansichten bevorzugt mit ihrem Spitznamen angezeigt.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Speichern
              </button>

              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
              >
                Zurück
              </Link>
            </div>
          </form>

          {club.logo_path ? (
            <form method="post" action="/api/admin/club" className="mt-6">
              <input type="hidden" name="remove_logo" value="1" />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                Logo entfernen
              </button>
            </form>
          ) : null}

          {canDeleteClub ? (
            <div className="mt-8 rounded-[24px] border border-rose-200 bg-rose-50/50 p-5">
              <div className="inline-flex rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-bold text-rose-700">
                Gefahrenbereich
              </div>

              <h2 className="mt-3 text-xl font-extrabold tracking-tight text-slate-950">
                Club dauerhaft löschen
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-700">
                Dadurch werden {clubLabel}, alle Mitglieder, Spieler, Sessions,
                Ergebnisse, Teams, Statistiken, MVP-Daten und hochgeladenen
                Bilder dauerhaft entfernt.
              </p>

              {clubDeleteError ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-800">
                  {clubDeleteError}
                </div>
              ) : null}

              <form
                method="post"
                action="/api/admin/club/delete"
                className="mt-5 space-y-4"
              >
                <div>
                  <label
                    htmlFor="club_delete_confirmation"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Zur Bestätigung „CLUB LÖSCHEN“ eingeben
                  </label>
                  <input
                    id="club_delete_confirmation"
                    name="confirmation"
                    type="text"
                    autoComplete="off"
                    className="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition focus:border-rose-500"
                    placeholder="CLUB LÖSCHEN"
                  />
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-white px-4 py-3">
                  <input
                    type="checkbox"
                    name="acknowledgement"
                    value="1"
                    className="mt-1 h-4 w-4 rounded border-rose-300"
                  />
                  <span className="text-sm leading-6 text-rose-900">
                    Mir ist bewusst, dass sämtliche Clubdaten endgültig
                    gelöscht werden und nicht wiederhergestellt werden können.
                  </span>
                </label>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700"
                >
                  Club dauerhaft löschen
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}