import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./specs",
  timeout: 30000,
  retries: 1,
  workers: 1, // shared seeded database — keep deterministic
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:8090",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } }, grepInvert: /@mobile/ },
    { name: "mobile", use: { viewport: { width: 360, height: 740 } }, grep: /@mobile/ },
  ],
});
