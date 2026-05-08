import { getAppEnv, isProductionEnv } from "@/lib/env";

export class ProductionSafetyError extends Error {
  constructor(actionName: string) {
    super(`${actionName} is not allowed in production.`);
    this.name = "ProductionSafetyError";
  }
}

export function assertNotProduction(actionName: string) {
  if (isProductionEnv()) {
    throw new ProductionSafetyError(actionName);
  }
}

export function assertTestEnvironment(actionName: string) {
  const appEnv = getAppEnv();

  if (appEnv === "production") {
    throw new ProductionSafetyError(actionName);
  }
}

export function canRunDangerousTestAction() {
  return !isProductionEnv();
}