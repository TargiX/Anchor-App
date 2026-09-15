import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "app.anchor.ritual",
  appName: "Anchor",
  loggingBehavior: "none",
  webDir: "out",
  backgroundColor: "#f8f3ec",
  server: { appStartPath: "/app/" },
}

export default config
