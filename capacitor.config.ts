/// <reference types="@capacitor-firebase/messaging" />

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "team.strikr.app",
  appName: "strikr",
  webDir: "public",
  server: {
    url: "https://www.strikr.team",
    cleartext: false,
  },
  ios: {
    includePlugins: ["@capacitor-firebase/messaging"],
  },
  plugins: {
    FirebaseMessaging: {
      presentationOptions: ["alert", "badge", "sound"],
    },
  },
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          "@capacitor-firebase/messaging": {
            symlink: true,
          },
        },
      },
    },
  },
};

export default config;
