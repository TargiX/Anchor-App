/// <reference types="@capacitor/status-bar" />
/// <reference types="@capacitor/local-notifications" />

import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "app.anchor.ritual",
  appName: "Anchor",
  webDir: "out",
  backgroundColor: "#f8f3ec",
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: "LIGHT",
      backgroundColor: "#f8f3ec",
    },
    LocalNotifications: {
      presentationOptions: ["banner", "list", "sound"],
    },
  },
}

export default config
