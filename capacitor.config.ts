import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lynoralink.app",
  appName: "LynoraLink",
  webDir: "public",
  server: {
    url: process.env.CAPACITOR_SERVER_URL || "https://lynoralink.vercel.app",
    cleartext: false,
  },
};

export default config;