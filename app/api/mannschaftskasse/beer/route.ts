import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { notifyBeerManagers } from "@/lib/cashbox/beer-notifications";

export async function POST(request: Request) {
  const { t } = await getServerI18n();
  try {
    const { clubId, player, user } = await requireClub();

    if (!player) {
      return NextResponse.json({ error: "Kein Spielerprofil gefunden." }, { status: 400 });
    }

    const formData = await request.formData();
    const quantity = Number(String(formData.get("quantity") ?? "1"));
    const paymentMethod =
      String(formData.get("payment_method") ?? "") === "cash" ? "cash" : "paypal";

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return NextResponse.json({ error: t("beerApi.invalidQuantity") }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: settings, error: settingsError } = await supabase
      .from("club_settings")
      .select(
        "beerkasse_premium_enabled,beerkasse_enabled,beerkasse_paypal_url,beerkasse_price_cents",
      )
      .eq("club_id", clubId)
      .maybeSingle();

    if (settingsError) {
      return NextResponse.json({ error: t("beerApi.loadFailed") }, { status: 500 });
    }

    const premiumEnabled = settings?.beerkasse_premium_enabled === true;
    const featureEnabled = settings?.beerkasse_enabled === true;
    const paypalUrl = settings?.beerkasse_paypal_url?.trim() ?? "";
    const unitPriceCents = Number(settings?.beerkasse_price_cents ?? 0);

    if (!premiumEnabled || !featureEnabled) {
      return NextResponse.json({ error: "Bierkasse ist nicht aktiv." }, { status: 403 });
    }

    if (paymentMethod === "paypal" && !paypalUrl) {
      return NextResponse.json({ error: "PayPal ist nicht eingerichtet." }, { status: 400 });
    }

    if (!Number.isInteger(unitPriceCents) || unitPriceCents < 1) {
      return NextResponse.json({ error: t("beerApi.invalidPrice") }, { status: 400 });
    }

    const totalCents = unitPriceCents * quantity;
    const { error } = await supabase.from("beer_consumptions").insert({
      club_id: clubId,
      player_id: player.id,
      quantity,
      unit_price_cents: unitPriceCents,
      total_cents: totalCents,
      payment_method: paymentMethod,
      payment_status: "pending",
      created_by: user.id,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: t("beerApi.addFailed") }, { status: 500 });
    }

    try {
      await notifyBeerManagers({
        clubId,
        playerId: player.id,
        quantity,
        totalCents,
        paymentMethod,
        excludeUserId: user.id,
      });
    } catch (pushError) {
      console.error("Beer manager push failed", pushError);
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: t("pushApi.notSignedIn") }, { status: 401 });
  }
}
