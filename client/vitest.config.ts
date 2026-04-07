import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";
import path from "path";

export default mergeConfig(
  viteConfig,
  defineConfig({
    resolve: {
      // Point all `graphql` imports to the same CJS entry point so that
      // makeExecutableSchema (used by the MSW schema handler) and the
      // graphql execute function share one GraphQLSchema class.
      alias: {
        graphql: path.resolve(
          __dirname,
          "../node_modules/graphql/index.js"
        ),
      },
    },
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
