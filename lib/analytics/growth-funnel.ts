import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type GrowthEventName =
  | "registration_completed"
  | "club_created"
  | "first_training_created"
  | "first_training_completed";

/** Server-only conversion writes. No names, email addresses, or visitor IDs. */
export async function recordGrowthEvent(
  eventName: GrowthEventName,
  clubId?: string,
) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("growth_funnel_events").insert({
      event_name: eventName,
      ...(clubId ? { club_id: clubId } : {}),
    });
    if (error && error.code !== "23505") {
      console.error("Growth conversion event could not be recorded", eventName);
    }
  } catch {
    // Analytics is best effort and must never break the business action.
    console.error("Growth conversion event could not be recorded", eventName);
  }
}

/** Record a first-training milestone only when this club had no prior training. */
export async function recordFirstTrainingCreated(clubId: string, sessionId: number) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("sessions")
      .select("id")
      .eq("club_id", clubId)
      .or("type.eq.training,type.is.null")
      .neq("id", sessionId)
      .limit(1);
    if (!error && (data?.length ?? 0) === 0) {
      await recordGrowthEvent("first_training_created", clubId);
    }
  } catch {
    console.error("Growth first-training event could not be recorded");
  }
}

/** Record the first successful result only if no other training was completed. */
export async function recordFirstTrainingCompleted(clubId: string) {
  try {
    const admin = createAdminClient();
    const { data: clubMilestone, error } = await admin
      .from("growth_funnel_events")
      .select("id")
      .eq("club_id", clubId)
      .in("event_name", ["club_created", "first_training_created"])
      .limit(1)
      .maybeSingle();
    // Only newly created clubs or clubs with a provably first training after rollout
    // can advance; legacy sessions are never backfilled as new conversions.
    if (!error && clubMilestone) {
      await recordGrowthEvent("first_training_completed", clubId);
    }
  } catch {
    console.error("Growth first-completed-training event could not be recorded");
  }
}
