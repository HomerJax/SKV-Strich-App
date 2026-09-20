import { redirect } from "next/navigation";
import { canManageClub } from "@/lib/auth/access";
import { requireClub } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import CashboxSetupWizard from "./CashboxSetupWizard";

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

type PlayerRow = {
  id: number;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  name: string | null;
};

function playerName(player: PlayerRow) {
  return (
    player.nickname?.trim() ||
    [player.first_name, player.last_name].filter(Boolean).join(" ") ||
    player.name ||
    `Spieler ${player.id}`
  );
}

function errorText(value?: string) {
  if (value === "module") return "Bitte mindestens einen Bereich aktivieren.";
  if (value === "price") return "Bitte einen gültigen Preis pro Bier eintragen.";
  if (value === "paypal") return "Bitte einen gültigen https-PayPal-Link eintragen.";
  if (value === "manager") return "Der Kassenwart konnte nicht gespeichert werden.";
  if (value) return "Das Setup konnte nicht gespeichert werden.";
  return "";
}

export default async function Page({ searchParams }: Props) {
  const q = await searchParams;
  const ctx = await requireClub();

  if (!canManageClub({ isPowerUser: ctx.isPowerUser, role: ctx.membership.role })) {
    redirect("/mannschaftskasse");
  }

  const admin = createAdminClient();
  const [{ data: settings }, { data: playersData }, { data: managersData }] =
    await Promise.all([
      admin
        .from("club_settings")
        .select(
          "cashbox_setup_completed,cashbox_penalties_enabled,cashbox_contributions_enabled,beerkasse_premium_enabled,beerkasse_enabled,beerkasse_home_enabled,beerkasse_paypal_url,beerkasse_price_cents",
        )
        .eq("club_id", ctx.clubId)
        .maybeSingle(),
      admin
        .from("players")
        .select("id,user_id,first_name,last_name,nickname,name")
        .eq("club_id", ctx.clubId)
        .eq("is_guest", false)
        .eq("is_active", true)
        .not("user_id", "is", null)
        .order("first_name"),
      admin
        .from("cashbox_managers")
        .select("user_id")
        .eq("club_id", ctx.clubId),
    ]);

  const managers = new Set(
    (managersData ?? []).map((row) => String(row.user_id)),
  );
  const players = ((playersData ?? []) as PlayerRow[])
    .filter((player) => Boolean(player.user_id))
    .map((player) => ({
      id: player.id,
      userId: player.user_id as string,
      name: playerName(player),
      selected: managers.has(player.user_id as string),
    }));

  return (
    <CashboxSetupWizard
      premiumBeer={settings?.beerkasse_premium_enabled === true}
      initialPenaltiesEnabled={settings?.cashbox_penalties_enabled === true}
      initialContributionsEnabled={settings?.cashbox_contributions_enabled === true}
      initialBeerEnabled={settings?.beerkasse_enabled === true}
      initialBeerPrice={((settings?.beerkasse_price_cents ?? 200) / 100)
        .toFixed(2)
        .replace(".", ",")}
      initialPaypalUrl={settings?.beerkasse_paypal_url ?? ""}
      initialBeerHomeEnabled={settings?.beerkasse_home_enabled === true}
      players={players}
      error={errorText(q?.error)}
      isExistingSetup={settings?.cashbox_setup_completed === true}
    />
  );
}
