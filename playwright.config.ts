import { defineConfig } from "@playwright/test";

const port = 3100;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  globalSetup: "./tests/browser/global-setup.ts",
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
  },
  projects: [
    {
      name: "mobile-375",
      use: {
        viewport: { width: 375, height: 812 },
      },
    },
    {
      name: "desktop-1280",
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});
