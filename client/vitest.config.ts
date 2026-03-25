import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.{ts,tsx}", "src/main.tsx"],
      },
    },
  })
);
