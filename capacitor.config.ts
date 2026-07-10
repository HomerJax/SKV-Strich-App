import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "team.strikr.app",
  appName: "strikr",
  webDir: "public",
  server: {
    url: "https://strikr.team",
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
