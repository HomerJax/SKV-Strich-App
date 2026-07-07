import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { canManageClub } from "@/lib/auth/access";
import PlayerSettingsCard from "@/components/admin/PlayerSettingsCard";

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
  balance_group: string | null;
  strength: number | null;
  is_active: boolean | null;
  is_guest: boolean | null;
  roster_role: "player" | "staff" | null;
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

type PageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

const BALANCE_GROUP_OPTIONS = [
  "Gehfußballer",
  "Defensivanker",
  "Offensivfokus",
  "Laufstark",
  "Techniker",
  "Balance-Gruppe 1",
  "Balance-Gruppe 2",
  "Balance-Gruppe 3",
] as const;

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

function getPlayerHeadline(player: PlayerRow) {
  const fullName = [player.first_name, player.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }

  if (player.name?.trim()) {
    return player.name.trim();
  }

  if (player.nickname?.trim()) {
    return player.nickname.trim();
  }

  return `Spieler #${player.id}`;
}

function getRosterRoleLabel(player: PlayerRow) {
  return player.roster_role === "staff" ? "Trainer/Betreuer" : "Spieler";
}

function getPlayerSubline(player: PlayerRow, settings: ClubSettingsRow | null) {
  return [
    player.is_guest ? "Gastspieler" : getRosterRoleLabel(player),
    player.is_active ? "Aktiv" : "Inaktiv",
    positionLabel(player.preferred_position, settings),
  ].join(" · ");
}

export default async function AdminPlayersPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = await searchParams;
  const { clubId, membership, isPowerUser } = await requireClub();

  if (!canManageClub({ isPowerUser, role: membership.role })) {
    redirect(AUTH_ROUTES.dashboard);
  }

  const supabase = await createClient();

  const [
    { data: settingsData, error: settingsError },
    { data: categoriesData, error: categoriesError },
    { data: playersData, error: playersError },
  ] = await Promise.all([
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
        "id, club_id, name, first_name, last_name, nickname, email, preferred_position, category_key, balance_group, strength, is_active, is_guest, roster_role"
      )
      .eq("club_id", clubId)
      .order("is_guest", { ascending: true })
      .order("last_name", { ascending: true, nullsFirst: false })
      .order("first_name", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
  ]);

  if (settingsError || categoriesError || playersError) {
    throw new Error(
      settingsError?.message ||
        categoriesError?.message ||
        playersError?.message ||
        "Daten konnten nicht geladen werden."
    );
  }

  const settings = (settingsData as ClubSettingsRow | null) ?? null;
  const categories = (categoriesData ?? []) as ClubCategoryRow[];
  const players = (playersData ?? []) as PlayerRow[];
  const flashError = resolvedSearchParams?.error ?? "";
  const flashMessage = resolvedSearchParams?.message ?? "";

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
          Spieler & Team-Generator
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Bearbeite Namen, E-Mail, Rolle, Position, Kategorie, Stärke und Status deiner
          Spieler und prüfe die Grundlagen für den Generator.
        </p>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">
          Hinweis für den Start
        </div>
        <div className="mt-2 text-sm leading-6 text-slate-600">
          Lege zuerst eure wichtigsten Grundlagen fest. Besonders sinnvoll ist es,
          früh eine oder mehrere Saisons anzulegen, damit Trainings und Tabelle
          später sauber zugeordnet werden.
        </div>


        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
          In den{" "}
          <Link
            href="/admin/seasons"
            className="font-semibold text-slate-900 underline underline-offset-4"
          >
            Saison-Einstellungen
          </Link>{" "}
          stellst du ein, wie eine Saison heißt und wann sie beginnt und endet.
          Trainings, deren Datum in diesen Zeitraum fällt, werden automatisch der
          passenden Saison zugeordnet.
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/admin/seasons"
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Saisons öffnen
          </Link>

          <Link
            href="/admin/club"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Team-Einstellungen öffnen
          </Link>
        </div>
      </div>

      <PlayerSettingsCard
        className="mb-4"
        useStrength={!!settings?.use_strength}
        strengthDefault={settings?.strength_default ?? 3}
        useCategories={!!settings?.use_categories}
        categoryCount={categories.length}
      />

      {flashMessage ? (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {flashMessage}
        </div>
      ) : null}

      {flashError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {flashError}
        </div>
      ) : null}

      {players.length > 0 ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          {players.length} Personen im Team hinterlegt. Tippe auf einen Eintrag,
          um die Bearbeitungsfelder aufzuklappen. Trainer/Betreuer können als anwesend geführt werden, landen aber nicht im Teamgenerator.
        </div>
      ) : null}

      {players.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500 shadow-sm">
          Noch keine Spieler vorhanden.
        </div>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {players.map((player, index) => {
              const categoryLabel =
                categories.find((category) => category.key === player.category_key)
                  ?.label ?? null;

              const positionLabel =
                player.preferred_position === "attack"
                  ? settings?.attack_label || "Vorne"
                  : player.preferred_position === "defense"
                    ? settings?.defense_label || "Hinten"
                    : player.preferred_position === "goalkeeper"
                      ? settings?.goalkeeper_label || "Torwart"
                      : "Offen";

              return (
                <details key={player.id} className="group px-5 py-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-3 py-3 transition hover:bg-slate-50 marker:hidden [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 flex flex-wrap items-center gap-2">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {getPlayerHeadline(player)}
                      </div>

                      {categoryLabel ? (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                          {categoryLabel}
                        </span>
                      ) : null}

                      <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {positionLabel}
                      </span>

                      {settings?.use_strength ? (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          Stärke {player.strength ?? settings?.strength_default ?? 3}
                        </span>
                      ) : null}

                      {player.balance_group ? (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                          {player.balance_group}
                        </span>
                      ) : null}

                      {player.roster_role === "staff" ? (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                          Staff
                        </span>
                      ) : null}

                      {!player.is_active ? (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                          Inaktiv
                        </span>
                      ) : null}

                      {player.is_guest ? (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">
                          Gast
                        </span>
                      ) : null}
                    </div>

                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-open:rotate-180">
                      ▼
                    </span>
                  </summary>

                  <div className="mt-2 rounded-2xl bg-slate-50 p-3">
                    <div className="mb-3 text-sm text-slate-500">
                      {player.email || getPlayerSubline(player, settings)}
                    </div>

                    <form method="post" action="/admin/players/update">
                      <input type="hidden" name="player_id" value={String(player.id)} />

                      <div className="mb-3 flex justify-end">
                        <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
                          Speichern
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label htmlFor={`first_name_${player.id}`} className="mb-1.5 block text-sm font-medium text-slate-900">Vorname</label>
                          <input id={`first_name_${player.id}`} name="first_name" defaultValue={player.first_name ?? ""} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900" />
                        </div>

                        <div>
                          <label htmlFor={`last_name_${player.id}`} className="mb-1.5 block text-sm font-medium text-slate-900">Nachname</label>
                          <input id={`last_name_${player.id}`} name="last_name" defaultValue={player.last_name ?? ""} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900" />
                        </div>

                        <div>
                          <label htmlFor={`nickname_${player.id}`} className="mb-1.5 block text-sm font-medium text-slate-900">Spitzname</label>
                          <input id={`nickname_${player.id}`} name="nickname" defaultValue={player.nickname ?? ""} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900" />
                        </div>

                        <div>
                          <label htmlFor={`email_${player.id}`} className="mb-1.5 block text-sm font-medium text-slate-900">E-Mail</label>
                          <input id={`email_${player.id}`} name="email" type="email" defaultValue={player.email ?? ""} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900" />
                        </div>

                        <div>
                          <label htmlFor={`roster_role_${player.id}`} className="mb-1.5 block text-sm font-medium text-slate-900">Rolle</label>
                          <select id={`roster_role_${player.id}`} name="roster_role" defaultValue={player.roster_role ?? "player"} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900">
                            <option value="player">Spieler</option>
                            <option value="staff">Trainer/Betreuer</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor={`preferred_position_${player.id}`} className="mb-1.5 block text-sm font-medium text-slate-900">{settings?.position_label || "Position"}</label>
                          <select id={`preferred_position_${player.id}`} name="preferred_position" defaultValue={player.preferred_position ?? ""} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900">
                            <option value="">Offen</option>
                            <option value="attack">{settings?.attack_label || "Angriff"}</option>
                            <option value="defense">{settings?.defense_label || "Abwehr"}</option>
                            <option value="goalkeeper">{settings?.goalkeeper_label || "Torwart"}</option>
                          </select>
                        </div>

                        {settings?.use_categories ? (
                          <div>
                            <label htmlFor={`category_key_${player.id}`} className="mb-1.5 block text-sm font-medium text-slate-900">Kategorie</label>
                            <select id={`category_key_${player.id}`} name="category_key" defaultValue={player.category_key ?? ""} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900">
                              <option value="">Keine Kategorie</option>
                              {categories.map((category) => (
                                <option key={category.key} value={category.key}>{category.label}</option>
                              ))}
                            </select>
                          </div>
                        ) : null}

                        {settings?.use_strength ? (
                          <div>
                            <label htmlFor={`strength_${player.id}`} className="mb-1.5 block text-sm font-medium text-slate-900">Stärke</label>
                            <select id={`strength_${player.id}`} name="strength" defaultValue={String(player.strength ?? settings?.strength_default ?? 3)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900">
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="3">3</option>
                              <option value="4">4</option>
                              <option value="5">5</option>
                            </select>
                          </div>
                        ) : null}

                        <div>
                          <label htmlFor={`balance_group_${player.id}`} className="mb-1.5 block text-sm font-medium text-slate-900">Balance-Gruppe</label>
                          <select id={`balance_group_${player.id}`} name="balance_group" defaultValue={player.balance_group ?? ""} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900">
                            <option value="">Keine Balance-Gruppe</option>
                            {BALANCE_GROUP_OPTIONS.map((group) => (
                              <option key={group} value={group}>{group}</option>
                            ))}
                            {player.balance_group && !BALANCE_GROUP_OPTIONS.includes(player.balance_group as (typeof BALANCE_GROUP_OPTIONS)[number]) ? (
                              <option value={player.balance_group}>Aktuell: {player.balance_group}</option>
                            ) : null}
                          </select>
                        </div>

                        <div>
                          <label htmlFor={`is_active_${player.id}`} className="mb-1.5 block text-sm font-medium text-slate-900">Für Trainings aktiv</label>
                          <select id={`is_active_${player.id}`} name="is_active" defaultValue={boolToYesNo(player.is_active)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900">
                            <option value="1">Ja</option>
                            <option value="0">Nein</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor={`is_guest_${player.id}`} className="mb-1.5 block text-sm font-medium text-slate-900">Gastspieler</label>
                          <select id={`is_guest_${player.id}`} name="is_guest" defaultValue={boolToYesNo(player.is_guest)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900">
                            <option value="0">Nein</option>
                            <option value="1">Ja</option>
                          </select>
                        </div>
                      </div>
                    </form>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}