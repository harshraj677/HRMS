import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId:   "com.anvecore.hrms",
  appName: "AnveCore HRMS",

  // The Android shell always loads from the live Vercel deployment.
  // NO static files are bundled — the APK is a native WebView wrapper.
  // Any code pushed to GitHub → Vercel is instantly visible in the app
  // without requiring an APK rebuild.
  webDir: "out",
  server: {
    url: "https://anvecore.vercel.app",
    cleartext: false, // HTTPS only
  },

  android: {
    // Allow camera and location prompts from the WebView
    allowMixedContent: false,
    captureInput: true,
    // Set to true when debugging with Chrome DevTools
    webContentsDebuggingEnabled: false,
  },

  // Capacitor plugins config
  plugins: {
    // Allow cookies to be sent cross-origin (required for JWT HttpOnly cookies)
    CapacitorCookies: {
      enabled: true,
    },
    // Allow HTTP requests to the Vercel deployment
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
