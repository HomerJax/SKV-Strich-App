import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { canManageClub } from "@/lib/auth/access";
import PlayerSettingsCard from "@/components/admin/PlayerSettingsCard";
import RosterBulkEditor from "@/components/admin/RosterBulkEditor";

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
  is_strong: boolean | null;
};

type PageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function AdminPlayersPage({ searchParams }: PageProps) {
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
      .select("key, label, sort_order, is_active, is_strong")
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
  const generatorPlayers = players.filter(
    (player) =>
      player.is_active !== false && (player.roster_role ?? "player") !== "staff"
  );
  const missingCategoryCount = generatorPlayers.filter(
    (player) => !player.category_key
  ).length;
  const missingPositionCount = generatorPlayers.filter(
    (player) => !player.preferred_position
  ).length;
  const defaultStrengthCount = generatorPlayers.filter(
    (player) => player.strength == null
  ).length;
  const balanceGroupCount = generatorPlayers.filter((player) =>
    Boolean(player.balance_group?.trim())
  ).length;
  const strongCategoryLabel =
    categories.find((category) => category.is_strong)?.label ?? null;
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

      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
          Kader & Teamgenerator
        </h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Erst Generator-Grundlagen prüfen, danach den Kader gesammelt pflegen.
          Änderungen an mehreren Spielern kannst du anschließend mit einem Klick
          speichern.
        </p>
      </div>

      <PlayerSettingsCard
        className="mb-4"
        useStrength={!!settings?.use_strength}
        strengthDefault={settings?.strength_default ?? 3}
        useCategories={!!settings?.use_categories}
        categoryCount={categories.length}
        categoryLabels={categories.map((category) => category.label)}
        strongCategoryLabel={strongCategoryLabel}
        activePlayerCount={generatorPlayers.length}
        missingCategoryCount={missingCategoryCount}
        missingPositionCount={missingPositionCount}
        defaultStrengthCount={defaultStrengthCount}
        balanceGroupCount={balanceGroupCount}
      />

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            Saison & Tabelle
          </div>
          <div className="mt-1 text-sm leading-6 text-slate-600">
            Saisons sind für Trainingszuordnung und Tabelle wichtig, aber keine
            Generator-Regel.
          </div>
        </div>
        <Link
          href="/admin/seasons"
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Saisons öffnen
        </Link>
      </div>

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
          <span className="font-semibold text-slate-900">Kader bearbeiten:</span>{" "}
          {players.length} Personen sind hinterlegt. Öffne beliebig viele Spieler,
          ändere Position, Kategorie, Stärke, Balance-Gruppe oder Status und
          speichere den gesamten Kader anschließend einmal.
        </div>
      ) : null}

      <RosterBulkEditor
        players={players}
        settings={settings}
        categories={categories.map((category) => ({
          key: category.key,
          label: category.label,
        }))}
      />
    </main>
  );
}
