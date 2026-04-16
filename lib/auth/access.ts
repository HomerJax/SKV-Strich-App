export function isAdminRole(role: string | null | undefined) {
  return role === "admin";
}

export function canManageClub(options: {
  isPowerUser?: boolean;
  role?: string | null;
}) {
  return options.isPowerUser === true || isAdminRole(options.role);
}