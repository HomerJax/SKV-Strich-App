import { promises as fs } from "node:fs";
import path from "node:path";
import { ShareBranding } from "./types";

export const SHARE_THEME = {
  primary: "#07122f",
  secondary: "#0b1d49",
  card: "rgba(255,255,255,0.10)",
  cardBorder: "rgba(255,255,255,0.14)",
  text: "#ffffff",
  muted: "#9fb0d1",
  soft: "rgba(255,255,255,0.08)",
  accent: "#22c55e",
  accentSoft: "rgba(34,197,94,0.18)",
};

const APP_NAME = "strikr";
const APP_TAGLINE = "made with strikr";
const APP_LOGO_PUBLIC_PATH = "public/icon-dark.png";

let cachedAppLogoDataUri: string | null | undefined;

async function loadLocalPngAsDataUri(relativePublicPath: string) {
  const absolutePath = path.join(process.cwd(), relativePublicPath);

  try {
    const file = await fs.readFile(absolutePath);
    const base64 = file.toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error("Could not load local share image:", absolutePath, error);
    return null;
  }
}

async function getAppLogoDataUri() {
  if (cachedAppLogoDataUri !== undefined) {
    return cachedAppLogoDataUri;
  }

  cachedAppLogoDataUri = await loadLocalPngAsDataUri(APP_LOGO_PUBLIC_PATH);
  return cachedAppLogoDataUri;
}

export async function getBaseShareBranding(): Promise<ShareBranding> {
  return {
    appName: APP_NAME,
    appTagline: APP_TAGLINE,
    appLogoUrl: await getAppLogoDataUri(),
    clubName: "Dein Verein",
    clubCrestUrl: null,
  };
}