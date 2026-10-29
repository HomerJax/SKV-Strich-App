export const CASHBOX_PILOT_CLUB_ID = "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60";

export const isCashboxPilotClub = (clubId: string) => clubId === CASHBOX_PILOT_CLUB_ID;
// The SKV penalty flow is enabled separately: do not enable the other pilot
// features (umbrella structure, accounts etc.) for SKV.
export const SKV_AH_CLUB_ID = "108590d9-0877-4787-90a5-4679615b3b76";
export const isPenaltyWorkflowClub = (clubId: string) =>
  isCashboxPilotClub(clubId) || clubId === SKV_AH_CLUB_ID;

export type PilotAccountKind = "bank" | "bank_subaccount" | "cash" | "paypal" | "sumup";

export type PilotAccount = {
  key: string;
  name: string;
  kind: PilotAccountKind;
  reference: string;
};

export type PilotCashboxStructure = {
  mode: "single" | "umbrella" | null;
  umbrellaName: string;
  accounts: PilotAccount[];
  routing: { contributions: string; penalties: string; beer: string };
  payments: { paypalPoolUrl: string; paypalMeUrl: string; sumupUrl: string; cashEnabled: boolean };
};

export const EMPTY_PILOT_CASHBOX: PilotCashboxStructure = {
  mode: null,
  umbrellaName: "",
  accounts: [],
  routing: { contributions: "", penalties: "", beer: "" },
  payments: { paypalPoolUrl: "", paypalMeUrl: "", sumupUrl: "", cashEnabled: true },
};

export function parsePilotCashboxStructure(input: unknown): PilotCashboxStructure {
  if (!input || typeof input !== "object") return EMPTY_PILOT_CASHBOX;
  const row = input as Record<string, unknown>;
  const rawAccounts = Array.isArray(row.accounts) ? row.accounts : [];
  const validKinds: PilotAccountKind[] = ["bank", "bank_subaccount", "cash", "paypal", "sumup"];
  const accounts: PilotAccount[] = rawAccounts.slice(0, 15).flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const account = value as Record<string, unknown>;
    if (typeof account.name !== "string" || !account.name.trim()) return [];
    if (typeof account.key !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(account.key)) return [];
    if (!validKinds.includes(account.kind as PilotAccountKind)) return [];
    return [{
      key: account.key,
      name: account.name.trim().slice(0, 80),
      kind: account.kind as PilotAccountKind,
      reference: typeof account.reference === "string" ? account.reference.trim().slice(0, 80) : "",
    }];
  });
  const rawRouting = row.routing && typeof row.routing === "object" ? row.routing as Record<string, unknown> : {};
  const validKeys = new Set(accounts.map(a => a.key));
  const route = (key: string) => typeof rawRouting[key] === "string" && validKeys.has(rawRouting[key] as string) ? rawRouting[key] as string : "";
  const rawPayments = row.payments && typeof row.payments === "object" ? row.payments as Record<string, unknown> : {};
  const url = (key: string) => typeof rawPayments[key] === "string" ? (rawPayments[key] as string).trim().slice(0, 500) : "";
  return {
    mode: row.mode === "single" || row.mode === "umbrella" ? row.mode : null,
    umbrellaName: typeof row.umbrellaName === "string" ? row.umbrellaName.trim().slice(0, 100) : "",
    accounts,
    routing: { contributions: route("contributions"), penalties: route("penalties"), beer: route("beer") },
    payments: {
      paypalPoolUrl: url("paypalPoolUrl"),
      paypalMeUrl: url("paypalMeUrl"),
      sumupUrl: url("sumupUrl"),
      cashEnabled: rawPayments.cashEnabled !== false,
    },
  };
}
