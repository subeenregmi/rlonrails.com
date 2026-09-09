import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:3102",
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  // Exercise optimized CSS and JS, just like the deployed site.
  webServer: {
    command: "npm run build && npm run start -- --hostname 127.0.0.1 --port 3102",
    url: "http://127.0.0.1:3102",
    timeout: 120_000,
  },
});
