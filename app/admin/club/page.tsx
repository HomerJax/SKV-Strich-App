import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type MembershipRow = {
  club_id: string;
  role: "admin" | "member";
};

type ClubRow = {
  id: string;
  display_name: string | null;
  logo_path: string | null;
};

type ClubAdminPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
  }>;
};

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
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto w-full max-w-3xl px-4 py-6">
          <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
              Kein Zugriff
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Bitte logge dich zuerst ein.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Zur Startseite
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const { data: membershipData } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const membership = (membershipData as MembershipRow | null) ?? null;

  if (!membership || membership.role !== "admin") {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto w-full max-w-3xl px-4 py-6">
          <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
              Kein Zugriff
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Dieser Bereich ist nur für Admins verfügbar.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Zur Startseite
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const { data: clubData } = await supabase
    .from("clubs")
    .select("id, display_name, logo_path")
    .eq("id", membership.club_id)
    .maybeSingle();

  const club = (clubData as ClubRow | null) ?? null;

  if (!club) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto w-full max-w-3xl px-4 py-6">
          <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
              Club nicht gefunden
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Für deinen Account konnte kein Club geladen werden.
            </p>
          </div>
        </section>
      </main>
    );
  }

  let logoUrl: string | null = null;

  if (club.logo_path) {
    const { data } = supabase.storage
      .from("club-logos")
      .getPublicUrl(club.logo_path);

    logoUrl = data.publicUrl;
  }

  const errorMessage = getErrorMessage(resolvedSearchParams?.error);
  const saved = resolvedSearchParams?.saved === "1";

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
              Clubname & Logo
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Diese Angaben erscheinen oben mittig im Header der App.
            </p>
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

            <div className="flex items-center gap-3">
              {logoUrl ? (
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm">
                  <img
                    src={logoUrl}
                    alt={club.display_name || "Clublogo"}
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
              </div>
            </div>
          </div>

          <form
            method="post"
            action="/api/admin/club"
            encType="multipart/form-data"
            className="space-y-4"
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
        </div>
      </section>
    </main>
  );
}