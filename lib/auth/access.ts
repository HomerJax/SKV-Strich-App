export function isAdminRole(role: string | null | undefined) {
  return role === "admin";
}

export function canManageClub(options: {
  isPowerUser?: boolean;
  role?: string | null;
}) {
  return options.isPowerUser === true || isAdminRole(options.role);
}
/** Permission check for guest roster changes. The verified club/session scope is
 * resolved by the server route before any service-role database operation. */
export function canManageGuestPlayer(options: {
  isPowerUser?: boolean;
  role?: string | null;
  canLeadTraining?: boolean;
}) {
  return canManageClub(options) || options.canLeadTraining === true;
}

/** Never serialize an individual strength to an ordinary training leader. */
export function maskGuestStrengthForClient<T extends { strength: number | null }>(
  player: T,
  mayReadIndividualStrength: boolean,
): T {
  return mayReadIndividualStrength ? player : { ...player, strength: null };
}
