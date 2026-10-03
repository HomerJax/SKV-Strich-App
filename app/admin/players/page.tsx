import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { canManageClub } from "@/lib/auth/access";
import PlayerSettingsCard from "@/components/admin/PlayerSettingsCard";
import RosterBulkEditor from "@/components/admin/RosterBulkEditor";
import { getServerI18n } from "@/lib/i18n/server";
import { getClubBillingAccess } from "@/lib/billing/club-billing";
import { FREE_FIXED_PLAYER_LIMIT, FREE_BALANCE_GROUP_LIMIT } from "@/lib/billing/product-limits";

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
  const { t } = await getServerI18n();
  const { clubId, membership, isPowerUser } = await requireClub();

  if (!canManageClub({ isPowerUser, role: membership.role })) {
    redirect(AUTH_ROUTES.dashboard);
  }

  const supabase = await createClient();

  const [
    { data: settingsData, error: settingsError },
    { data: categoriesData, error: categoriesError },
    { data: playersData, error: playersError },
    billingAccess,
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
    getClubBillingAccess(supabase, clubId),
  ]);

  if (settingsError || categoriesError || playersError) {
    throw new Error(
      settingsError?.message ||
        categoriesError?.message ||
        playersError?.message ||
        t("adminPlayers.loadFailed")
    );
  }

  const settings = (settingsData as ClubSettingsRow | null) ?? null;
  const categories = (categoriesData ?? []) as ClubCategoryRow[];
  const players = (playersData ?? []) as PlayerRow[];
  const fixedPlayerCount = players.filter((player) => player.is_guest !== true && (player.roster_role ?? "player") !== "staff").length;
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
  const balanceGroups = Array.from(
    generatorPlayers.reduce((groups, player) => {
      const group = player.balance_group?.trim() || "";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(player);
      return groups;
    }, new Map<string, PlayerRow[]>())
  ).sort(([a], [b]) => {
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b, "de", { numeric: true, sensitivity: "base" });
  });
  const playerDisplayName = (player: PlayerRow) =>
    player.nickname?.trim() ||
    [player.first_name, player.last_name].filter(Boolean).join(" ").trim() ||
    player.name?.trim() ||
    `Spieler ${player.id}`;

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
          ← {t("settings.page.backAdmin")}
        </Link>
      </div>

      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
          {t("adminPlayers.title")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          {t("adminPlayers.description")}
        </p>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
          {billingAccess.isPro
            ? `${fixedPlayerCount} feste Spieler · PRO`
            : `${fixedPlayerCount}/${FREE_FIXED_PLAYER_LIMIT} feste Spieler · weitere 🔒 PRO`}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
          {billingAccess.isPro
            ? "Mehrere Balanced Groups · PRO"
            : `${FREE_BALANCE_GROUP_LIMIT} Balanced Group Free · weitere 🔒 PRO`}
        </div>
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
        balanceGroups={balanceGroups.map(([name, groupPlayers]) => ({
          name,
          players: groupPlayers
            .map(playerDisplayName)
            .sort((a, b) => a.localeCompare(b, "de")),
        }))}
      />

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
