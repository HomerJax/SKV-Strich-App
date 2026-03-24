import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

type SearchParams = {
  error?: string | string[];
  message?: string | string[];
};

type MembershipRow = {
  club_id: string;
  role: "admin" | "member";
};

type PlayerRow = {
  id: number;
  club_id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  email: string | null;
  preferred_position: "attack" | "defense" | "goalkeeper" | null;
  category_key: string | null;
  strength: number | null;
  is_active: boolean | null;
  is_guest: boolean | null;
};

type ClubSettingsRow = {
  use_strength: boolean | null;
  strength_default: number | null;
  use_categories: boolean | null;
  position_label: string | null;
  attack_label: string | null;
  defense_label: string | null;
  goalkeeper_label: string | null;
};

type ClubCategoryRow = {
  key: string;
  label: string;
  sort_order: number | null;
  is_active: boolean | null;
};

function getSingle(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function boolToYesNo(value: boolean | null | undefined) {
  return value ? "1" : "0";
}

function positionLabel(
  position: PlayerRow["preferred_position"],
  settings: ClubSettingsRow | null
) {
  if (position === "attack") return settings?.attack_label || "Angriff";
  if (position === "defense") return settings?.defense_label || "Abwehr";
  if (position === "goalkeeper") return settings?.goalkeeper_label || "Torwart";
  return "Offen";
}

export default async function AdminPlayersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const error = getSingle(resolvedSearchParams?.error);
  const message = getSingle(resolvedSearchParams?.message);

  const cookieStore = await cookies();
  const activeClubIdFromCookie = cookieStore.get("active_club_id")?.value ?? null;

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
    redirect("/login?next=/admin/players");
  }

  const { data: membershipsData, error: membershipsError } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const memberships = (membershipsData ?? []) as MembershipRow[];

  if (memberships.length === 0) {
    redirect("/waiting-for-invite");
  }

  const validClubIds = new Set(memberships.map((m) => m.club_id));

  const activeClubId =
    memberships.length === 1
      ? memberships[0].club_id
      : activeClubIdFromCookie && validClubIds.has(activeClubIdFromCookie)
        ? activeClubIdFromCookie
        : null;

  if (!activeClubId) {
    redirect("/select-club");
  }

  const membership =
    memberships.find((item) => item.club_id === activeClubId) ?? null;

  if (!membership || membership.role !== "admin") {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-24">
        <div className="mb-4 flex items-center">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Adminbereich
          </Link>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Kein Admin-Zugriff für das aktuell ausgewählte Team.
        </div>
      </main>
    );
  }

  const clubId = activeClubId;

  const [{ data: settings }, { data: categories }, { data: players, error: playersError }] =
    await Promise.all([
      supabase
        .from("club_settings")
        .select(
          "use_strength, strength_default, use_categories, position_label, attack_label, defense_label, goalkeeper_label"
        )
        .eq("club_id", clubId)
        .maybeSingle(),
      supabase
        .from("club_categories")
        .select("key, label, sort_order, is_active")
        .eq("club_id", clubId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("players")
        .select(
          "id, club_id, name, first_name, last_name, nickname, email, preferred_position, category_key, strength, is_active, is_guest"
        )
        .eq("club_id", clubId)
        .order("is_guest", { ascending: true })
        .order("last_name", { ascending: true, nullsFirst: false })
        .order("first_name", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true }),
    ]);

  if (playersError) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-24">
        <div className="mb-4 flex items-center">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Adminbereich
          </Link>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Spieler konnten nicht geladen werden.
        </div>
      </main>
    );
  }

  const safeSettings = (settings as ClubSettingsRow | null) ?? null;
  const safeCategories = (categories ?? []) as ClubCategoryRow[];
  const safePlayers = (players ?? []) as PlayerRow[];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-24">
      <div className="mb-4 flex items-center">
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
        >
          ← Zurück zum Adminbereich
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
          Spieler verwalten
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Bearbeite Namen, E-Mail, Position, Kategorie und Status deiner Spieler.
        </p>
      </div>

      {message ? (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        {safePlayers.map((p) => (
          <form
            key={p.id}
            method="post"
            action="/api/admin/players/update"
            className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <input type="hidden" name="player_id" value={String(p.id)} />

            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-neutral-900">
                  {p.nickname?.trim()
                    ? p.nickname
                    : [p.first_name, p.last_name].filter(Boolean).join(" ").trim() ||
                      p.name ||
                      `Spieler #${p.id}`}
                </div>
                <div className="mt-1 text-sm text-neutral-500">
                  {p.is_guest ? "Gastspieler" : "Normaler Spieler"} ·{" "}
                  {p.is_active ? "Aktiv" : "Inaktiv"} ·{" "}
                  {positionLabel(p.preferred_position, safeSettings)}
                </div>
              </div>

              <button
                type="submit"
                className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Speichern
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor={`first_name_${p.id}`}
                  className="mb-1.5 block text-sm font-medium text-neutral-900"
                >
                  Vorname
                </label>
                <input
                  id={`first_name_${p.id}`}
                  name="first_name"
                  defaultValue={p.first_name ?? ""}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
                />
              </div>

              <div>
                <label
                  htmlFor={`last_name_${p.id}`}
                  className="mb-1.5 block text-sm font-medium text-neutral-900"
                >
                  Nachname
                </label>
                <input
                  id={`last_name_${p.id}`}
                  name="last_name"
                  defaultValue={p.last_name ?? ""}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
                />
              </div>

              <div>
                <label
                  htmlFor={`nickname_${p.id}`}
                  className="mb-1.5 block text-sm font-medium text-neutral-900"
                >
                  Spitzname
                </label>
                <input
                  id={`nickname_${p.id}`}
                  name="nickname"
                  defaultValue={p.nickname ?? ""}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
                />
              </div>

              <div>
                <label
                  htmlFor={`email_${p.id}`}
                  className="mb-1.5 block text-sm font-medium text-neutral-900"
                >
                  E-Mail
                </label>
                <input
                  id={`email_${p.id}`}
                  name="email"
                  type="email"
                  defaultValue={p.email ?? ""}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
                />
              </div>

              <div>
                <label
                  htmlFor={`preferred_position_${p.id}`}
                  className="mb-1.5 block text-sm font-medium text-neutral-900"
                >
                  {safeSettings?.position_label || "Position"}
                </label>
                <select
                  id={`preferred_position_${p.id}`}
                  name="preferred_position"
                  defaultValue={p.preferred_position ?? ""}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
                >
                  <option value="">Offen</option>
                  <option value="attack">
                    {safeSettings?.attack_label || "Angriff"}
                  </option>
                  <option value="defense">
                    {safeSettings?.defense_label || "Abwehr"}
                  </option>
                  <option value="goalkeeper">
                    {safeSettings?.goalkeeper_label || "Torwart"}
                  </option>
                </select>
              </div>

              {safeSettings?.use_categories ? (
                <div>
                  <label
                    htmlFor={`category_key_${p.id}`}
                    className="mb-1.5 block text-sm font-medium text-neutral-900"
                  >
                    Kategorie
                  </label>
                  <select
                    id={`category_key_${p.id}`}
                    name="category_key"
                    defaultValue={p.category_key ?? ""}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
                  >
                    <option value="">Keine Kategorie</option>
                    {safeCategories.map((category) => (
                      <option key={category.key} value={category.key}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {safeSettings?.use_strength ? (
                <div>
                  <label
                    htmlFor={`strength_${p.id}`}
                    className="mb-1.5 block text-sm font-medium text-neutral-900"
                  >
                    Stärke
                  </label>
                  <select
                    id={`strength_${p.id}`}
                    name="strength"
                    defaultValue={String(
                      p.strength ?? safeSettings?.strength_default ?? 3
                    )}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                </div>
              ) : null}

              <div>
                <label
                  htmlFor={`is_active_${p.id}`}
                  className="mb-1.5 block text-sm font-medium text-neutral-900"
                >
                  Aktiv
                </label>
                <select
                  id={`is_active_${p.id}`}
                  name="is_active"
                  defaultValue={boolToYesNo(p.is_active)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
                >
                  <option value="1">Ja</option>
                  <option value="0">Nein</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor={`is_guest_${p.id}`}
                  className="mb-1.5 block text-sm font-medium text-neutral-900"
                >
                  Gastspieler
                </label>
                <select
                  id={`is_guest_${p.id}`}
                  name="is_guest"
                  defaultValue={boolToYesNo(p.is_guest)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
                >
                  <option value="0">Nein</option>
                  <option value="1">Ja</option>
                </select>
              </div>
            </div>
          </form>
        ))}
      </div>
    </main>
  );
}