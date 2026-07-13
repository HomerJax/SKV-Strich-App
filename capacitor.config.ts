/// <reference types="@capacitor-firebase/messaging" />

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "team.strikr.app",
  appName: "strikr",
  webDir: "public",
  server: {
    url: "https://www.strikr.team",
    cleartext: false,
    appStartPath: "/app-start",
  },
  ios: {
    includePlugins: [],
  },
};

export default config;
