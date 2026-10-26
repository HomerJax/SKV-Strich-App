/**
 * Explicit Production rollout of the guided training assistant.
 * Other clubs retain the established session detail experience.
 */
export const STRIKR_TRAINING_WIZARD_CLUB_ID = "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60";
export const SKV_RUTESHEIM_AH_CLUB_ID = "108590d9-0877-4787-90a5-4679615b3b76";
export const SPVGG_RENNINGEN_CLUB_ID = "b8d4b692-baf1-4263-8fdd-64df424114a7";

const TRAINING_WIZARD_CLUB_IDS = new Set([
  STRIKR_TRAINING_WIZARD_CLUB_ID,
  SKV_RUTESHEIM_AH_CLUB_ID,
  SPVGG_RENNINGEN_CLUB_ID,
]);

export function hasGuidedTrainingAssistant(clubId: string | null | undefined): boolean {
  return typeof clubId === "string" && TRAINING_WIZARD_CLUB_IDS.has(clubId);
}
