import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push/send-push";

type PaymentMethod = "paypal" | "cash";

function formatEuro(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export async function notifyBeerManagers(params: {
  clubId: string;
  playerId: number;
  quantity: number;
  totalCents: number;
  paymentMethod: PaymentMethod;
  excludeUserId?: string | null;
}) {
  const {
    clubId,
    playerId,
    quantity,
    totalCents,
    paymentMethod,
    excludeUserId,
  } = params;

  const admin = createAdminClient();

  const [
    { data: memberships },
    { data: beerManagers },
    { data: cashboxManagers },
    { data: player },
  ] = await Promise.all([
    admin
      .from("club_memberships")
      .select("user_id,role")
      .eq("club_id", clubId)
      .in("role", ["admin", "owner"]),
    admin
      .from("club_member_permissions")
      .select("user_id")
      .eq("club_id", clubId)
      .eq("permission_key", "manage_beerkasse"),
    admin
      .from("cashbox_managers")
      .select("user_id")
      .eq("club_id", clubId),
    admin
      .from("players")
      .select("first_name,last_name,nickname,name")
      .eq("club_id", clubId)
      .eq("id", playerId)
      .maybeSingle<{
        first_name: string | null;
        last_name: string | null;
        nickname: string | null;
        name: string | null;
      }>(),
  ]);

  const userIds = [
    ...new Set([
      ...(memberships ?? []).map((row) => row.user_id),
      ...(beerManagers ?? []).map((row) => row.user_id),
      ...(cashboxManagers ?? []).map((row) => row.user_id),
    ]),
  ]
    .filter((value): value is string => Boolean(value))
    .filter((value) => value !== excludeUserId);

  if (userIds.length === 0) return;

  const displayName =
    player?.nickname?.trim() ||
    [player?.first_name, player?.last_name].filter(Boolean).join(" ").trim() ||
    player?.name?.trim() ||
    "Ein Spieler";

  const methodLabel = paymentMethod === "cash" ? "bar" : "per PayPal";

  await sendPushToUsers({
    userIds,
    title: "🍺 Bierkasse prüfen",
    body: `${displayName} hat ${quantity} Bier (${formatEuro(totalCents)}) ${methodLabel} eingetragen.`,
    url: "/mannschaftskasse/bier",
  });
}
