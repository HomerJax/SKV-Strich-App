import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSumUpCheckout } from "@/lib/cashbox/sumup";

export async function confirmSumUpBeerPayment(consumptionId: number) {
  const admin = createAdminClient();
  const { data: entry, error } = await admin
    .from("beer_consumptions")
    .select("id,club_id,quantity,donation_cents,total_cents,payment_method,payment_status,payment_external_id,cash_transaction_id")
    .eq("id", consumptionId)
    .maybeSingle<{
      id: number;
      club_id: string;
      quantity: number;
      donation_cents: number;
      total_cents: number;
      payment_method: "paypal" | "cash" | "sumup";
      payment_status: "pending" | "paid" | "cancelled";
      payment_external_id: string | null;
      cash_transaction_id: number | null;
    }>();

  if (error || !entry || entry.payment_method !== "sumup" || !entry.payment_external_id) {
    return { status: "invalid" as const };
  }

  if (entry.payment_status === "paid") {
    return { status: "paid" as const };
  }

  if (entry.payment_status === "cancelled") {
    return { status: "cancelled" as const };
  }

  const checkout = await getSumUpCheckout(entry.payment_external_id);
  if (checkout.status !== "PAID") {
    return { status: checkout.status.toLowerCase() as "pending" | "failed" | "expired" };
  }

  const sourceKey = `beer:${entry.id}:sumup-payment`;
  let transactionId = entry.cash_transaction_id;

  if (!transactionId) {
    const { data: transaction, error: transactionError } = await admin
      .from("cash_transactions")
      .insert({
        club_id: entry.club_id,
        amount_cents: entry.total_cents,
        kind: "income",
        category: "Getränke",
        title: `Bierkasse · ${entry.quantity} Bier${entry.donation_cents > 0 ? ` + ${(entry.donation_cents / 100).toFixed(2)} € Spende` : ""} · SumUp`,
        source_type: "beer",
        source_id: entry.id,
        source_key: sourceKey,
      })
      .select("id")
      .single<{ id: number }>();

    if (transactionError?.code === "23505") {
      const { data: existing } = await admin
        .from("cash_transactions")
        .select("id")
        .eq("club_id", entry.club_id)
        .eq("source_key", sourceKey)
        .maybeSingle<{ id: number }>();
      transactionId = existing?.id ?? null;
    } else if (transactionError) {
      throw transactionError;
    } else {
      transactionId = transaction?.id ?? null;
    }
  }

  if (!transactionId) {
    throw new Error("Could not create SumUp cash transaction");
  }

  const { error: updateError } = await admin
    .from("beer_consumptions")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      cash_transaction_id: transactionId,
      payment_external_id: checkout.transaction_id ?? entry.payment_external_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entry.id)
    .eq("payment_status", "pending");

  if (updateError) throw updateError;

  return { status: "paid" as const };
}
