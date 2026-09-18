"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { requireCashboxAccess } from "@/lib/cashbox/access";
import { parseEuroToCents } from "@/lib/cashbox/money";

function cashUrl(tab: string, params: Record<string, string> = {}) {
  const search = new URLSearchParams({ tab, ...params });
  return `/admin/penalties?${search.toString()}`;
}

function refreshCashbox() {
  revalidatePath("/admin/penalties");
  revalidatePath("/mannschaftskasse");
  revalidatePath("/home");
}

async function managerCtx() {
  const ctx = await requireCashboxAccess({ manage: true });
  return {
    ...ctx,
    admin: createAdminClient(),
  };
}

async function reverseTransaction(params: {
  admin: ReturnType<typeof createAdminClient>;
  clubId: string;
  transactionId: number;
  userId: string;
  sourceKey?: string;
}) {
  const { admin, clubId, transactionId, userId } = params;

  const { data: original, error: originalError } = await admin
    .from("cash_transactions")
    .select("id,amount_cents,category,title")
    .eq("club_id", clubId)
    .eq("id", transactionId)
    .maybeSingle<{
      id: number;
      amount_cents: number;
      category: string;
      title: string;
    }>();

  if (originalError) throw new Error(originalError.message);
  if (!original) return;

  const { data: existingReversal, error: reversalCheckError } = await admin
    .from("cash_transactions")
    .select("id")
    .eq("club_id", clubId)
    .eq("reversed_transaction_id", original.id)
    .maybeSingle<{ id: number }>();

  if (reversalCheckError) throw new Error(reversalCheckError.message);
  if (existingReversal) return;

  const sourceKey = params.sourceKey ?? `reversal:${original.id}`;

  const { error } = await admin.from("cash_transactions").insert({
    club_id: clubId,
    amount_cents: -original.amount_cents,
    kind: "reversal",
    category: original.category,
    title: `Storno: ${original.title}`,
    reversed_transaction_id: original.id,
    source_type: "reversal",
    source_id: original.id,
    source_key: sourceKey,
    created_by: userId,
  });

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
}

export async function addCashTransactionAction(formData: FormData) {
  const { admin, clubId, user } = await managerCtx();
  const direction = String(formData.get("direction") ?? "income");
  const amountCents = parseEuroToCents(String(formData.get("amount") ?? ""));
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "Sonstiges").trim() || "Sonstiges";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const occurredOn = String(formData.get("occurred_on") ?? "").trim() || null;

  if (!amountCents || amountCents <= 0 || !title) {
    redirect(cashUrl("transactions", { error: "Bitte Betrag und Beschreibung angeben." }));
  }

  const signedAmount = direction === "expense" ? -amountCents : amountCents;

  const { error } = await admin.from("cash_transactions").insert({
    club_id: clubId,
    amount_cents: signedAmount,
    kind: direction === "expense" ? "expense" : "income",
    category,
    title,
    notes,
    occurred_on: occurredOn || undefined,
    source_type: "manual",
    created_by: user.id,
  });

  if (error) {
    redirect(cashUrl("transactions", { error: error.message }));
  }

  refreshCashbox();
  redirect(cashUrl("transactions", { saved: "1" }));
}

export async function reverseCashTransactionAction(formData: FormData) {
  const { admin, clubId, user } = await managerCtx();
  const transactionId = Number(String(formData.get("transaction_id") ?? ""));

  if (!Number.isFinite(transactionId)) {
    redirect(cashUrl("transactions", { error: "Ungültiger Umsatz." }));
  }

  try {
    await reverseTransaction({
      admin,
      clubId,
      transactionId,
      userId: user.id,
    });
  } catch (error) {
    redirect(cashUrl("transactions", {
      error: error instanceof Error ? error.message : "Storno fehlgeschlagen.",
    }));
  }

  refreshCashbox();
  redirect(cashUrl("transactions", { saved: "1" }));
}

export async function addContributionAction(formData: FormData) {
  const { admin, clubId, user } = await managerCtx();
  const title = String(formData.get("title") ?? "").trim();
  const amountCents = parseEuroToCents(String(formData.get("amount") ?? ""));
  const dueDate = String(formData.get("due_date") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const allPlayers = formData.get("all_players") === "on";

  if (!title || !amountCents || amountCents <= 0) {
    redirect(cashUrl("contributions", { error: "Bitte Titel und positiven Betrag angeben." }));
  }

  let playerIds = formData
    .getAll("player_ids")
    .map((value) => Number(String(value)))
    .filter((value) => Number.isFinite(value));

  if (allPlayers) {
    const { data: players, error: playersError } = await admin
      .from("players")
      .select("id")
      .eq("club_id", clubId)
      .eq("is_active", true)
      .eq("is_guest", false);

    if (playersError) {
      redirect(cashUrl("contributions", { error: playersError.message }));
    }

    playerIds = (players ?? []).map((player) => Number(player.id));
  } else if (playerIds.length > 0) {
    const { data: validPlayers, error: playersError } = await admin
      .from("players")
      .select("id")
      .eq("club_id", clubId)
      .eq("is_active", true)
      .eq("is_guest", false)
      .in("id", playerIds);

    if (playersError) {
      redirect(cashUrl("contributions", { error: playersError.message }));
    }

    playerIds = (validPlayers ?? []).map((player) => Number(player.id));
  }

  playerIds = Array.from(new Set(playerIds));

  if (playerIds.length === 0) {
    redirect(cashUrl("contributions", { error: "Bitte mindestens einen Spieler auswählen." }));
  }

  const { data: contribution, error: contributionError } = await admin
    .from("cash_contributions")
    .insert({
      club_id: clubId,
      title,
      amount_cents: amountCents,
      due_date: dueDate,
      notes,
      created_by: user.id,
    })
    .select("id")
    .single<{ id: number }>();

  if (contributionError || !contribution) {
    redirect(cashUrl("contributions", {
      error: contributionError?.message ?? "Beitrag konnte nicht angelegt werden.",
    }));
  }

  const { error: memberError } = await admin
    .from("cash_contribution_members")
    .insert(
      playerIds.map((playerId) => ({
        contribution_id: contribution.id,
        club_id: clubId,
        player_id: playerId,
        status: "open",
      })),
    );

  if (memberError) {
    await admin.from("cash_contributions").delete().eq("id", contribution.id).eq("club_id", clubId);
    redirect(cashUrl("contributions", { error: memberError.message }));
  }

  refreshCashbox();
  redirect(cashUrl("contributions", { saved: "1" }));
}

export async function setContributionStatusAction(formData: FormData) {
  const { admin, clubId, user } = await managerCtx();
  const contributionId = Number(String(formData.get("contribution_id") ?? ""));
  const playerId = Number(String(formData.get("player_id") ?? ""));
  const statusRaw = String(formData.get("status") ?? "");
  const nextStatus = statusRaw === "paid" || statusRaw === "exempt" ? statusRaw : "open";

  if (!Number.isFinite(contributionId) || !Number.isFinite(playerId)) {
    redirect(cashUrl("contributions", { error: "Ungültiger Beitrag." }));
  }

  const [
    { data: contribution, error: contributionError },
    { data: member, error: memberError },
  ] = await Promise.all([
    admin
      .from("cash_contributions")
      .select("id,title,amount_cents")
      .eq("club_id", clubId)
      .eq("id", contributionId)
      .maybeSingle<{ id: number; title: string; amount_cents: number }>(),
    admin
      .from("cash_contribution_members")
      .select("status,cash_transaction_id")
      .eq("club_id", clubId)
      .eq("contribution_id", contributionId)
      .eq("player_id", playerId)
      .maybeSingle<{ status: "open" | "paid" | "exempt"; cash_transaction_id: number | null }>(),
  ]);

  if (contributionError || memberError || !contribution || !member) {
    redirect(cashUrl("contributions", { error: "Beitrag konnte nicht geladen werden." }));
  }

  if (member.status === nextStatus) {
    redirect(cashUrl("contributions"));
  }

  let transactionId: number | null = member.cash_transaction_id ?? null;

  if (member.status === "paid" && member.cash_transaction_id) {
    try {
      await reverseTransaction({
        admin,
        clubId,
        transactionId: member.cash_transaction_id,
        userId: user.id,
        sourceKey: `contribution:${contributionId}:${playerId}:reversal:${Date.now()}`,
      });
    } catch (error) {
      redirect(cashUrl("contributions", {
        error: error instanceof Error ? error.message : "Gegenbuchung fehlgeschlagen.",
      }));
    }
    transactionId = null;
  }

  if (nextStatus === "paid") {
    const sourceKey = `contribution:${contributionId}:${playerId}:payment:${Date.now()}`;
    const { data: transaction, error: transactionError } = await admin
      .from("cash_transactions")
      .insert({
        club_id: clubId,
        amount_cents: contribution.amount_cents,
        kind: "income",
        category: "Beiträge",
        title: contribution.title,
        source_type: "contribution",
        source_id: contributionId,
        source_key: sourceKey,
        created_by: user.id,
      })
      .select("id")
      .single<{ id: number }>();

    if (transactionError || !transaction) {
      redirect(cashUrl("contributions", {
        error: transactionError?.message ?? "Zahlung konnte nicht gebucht werden.",
      }));
    }
    transactionId = transaction.id;
  }

  const { error: updateError } = await admin
    .from("cash_contribution_members")
    .update({
      status: nextStatus,
      paid_at: nextStatus === "paid" ? new Date().toISOString() : null,
      cash_transaction_id: nextStatus === "paid" ? transactionId : null,
      updated_at: new Date().toISOString(),
    })
    .eq("club_id", clubId)
    .eq("contribution_id", contributionId)
    .eq("player_id", playerId);

  if (updateError) {
    redirect(cashUrl("contributions", { error: updateError.message }));
  }

  refreshCashbox();
  redirect(cashUrl("contributions", { saved: "1" }));
}

export async function archiveContributionAction(formData: FormData) {
  const { admin, clubId } = await managerCtx();
  const contributionId = Number(String(formData.get("contribution_id") ?? ""));

  if (!Number.isFinite(contributionId)) {
    redirect(cashUrl("contributions", { error: "Ungültiger Beitrag." }));
  }

  const archived = formData.get("archived") === "1";
  const { error } = await admin
    .from("cash_contributions")
    .update({
      archived_at: archived ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("club_id", clubId)
    .eq("id", contributionId);

  if (error) {
    redirect(cashUrl("contributions", { error: error.message }));
  }

  refreshCashbox();
  redirect(cashUrl("contributions", { saved: "1" }));
}

export async function setCashboxManagerAction(formData: FormData) {
  const ctx = await requireClub();

  if (!canManageClub({ isPowerUser: ctx.isPowerUser, role: ctx.membership.role })) {
    redirect("/mannschaftskasse");
  }

  const userId = String(formData.get("user_id") ?? "").trim();
  const enabled = formData.get("enabled") === "1";
  const admin = createAdminClient();

  if (!userId) {
    redirect(cashUrl("settings", { error: "Mitglied fehlt." }));
  }

  const { data: membership, error: membershipError } = await admin
    .from("club_memberships")
    .select("user_id")
    .eq("club_id", ctx.clubId)
    .eq("user_id", userId)
    .maybeSingle<{ user_id: string }>();

  if (membershipError || !membership) {
    redirect(cashUrl("settings", { error: "Mitglied nicht gefunden." }));
  }

  const result = enabled
    ? await admin.from("cashbox_managers").upsert({
        club_id: ctx.clubId,
        user_id: userId,
        created_by: ctx.user.id,
      }, { onConflict: "club_id,user_id" })
    : await admin
        .from("cashbox_managers")
        .delete()
        .eq("club_id", ctx.clubId)
        .eq("user_id", userId);

  if (result.error) {
    redirect(cashUrl("settings", { error: result.error.message }));
  }

  refreshCashbox();
  redirect(cashUrl("settings", { saved: "1" }));
}
