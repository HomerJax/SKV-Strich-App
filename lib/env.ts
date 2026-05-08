export type AppEnv = "development" | "staging" | "production";

export function getAppEnv(): AppEnv {
  const value = process.env.NEXT_PUBLIC_APP_ENV;

  if (value === "production" || value === "staging" || value === "development") {
    return value;
  }

  if (process.env.NODE_ENV === "production") {
    return "production";
  }

  return "development";
}

export function isProductionEnv() {
  return getAppEnv() === "production";
}

export function isStagingEnv() {
  return getAppEnv() === "staging";
}

export function isDevelopmentEnv() {
  return getAppEnv() === "development";
}

export function getAppUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, "");
  }

  if (isProductionEnv()) {
    return "https://strikr.team";
  }

  if (isStagingEnv()) {
    return "https://staging.strikr.team";
  }

  return "http://localhost:3000";
}