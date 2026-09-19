/// <reference types="@capacitor-firebase/messaging" />

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "team.strikr.app",
  appName: "strikr",
  webDir: "public",
  server: {
    url: "https://www.strikr.team",
    appStartPath: "/home",
    cleartext: false,
    allowNavigation: ["www.strikr.team", "strikr.team"],
  },
  android: {
    includePlugins: [
      "@capacitor-firebase/messaging",
      "@capacitor/app",
      "@capacitor/filesystem",
      "@capacitor/share",
    ],
  },
  ios: {
    includePlugins: [
      "@capacitor-firebase/messaging",
      "@capacitor/filesystem",
      "@capacitor/share",
    ],
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
