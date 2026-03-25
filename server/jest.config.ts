import type { Config } from "jest";

const config: Config = {
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          target: "ES2022",
          strict: true,
          noUncheckedIndexedAccess: true,
          esModuleInterop: true,
          isolatedModules: true,
          resolveJsonModule: true,
        },
      },
    ],
  },

  // Rewrite .js imports back to extensionless for Jest resolution
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  testMatch: ["<rootDir>/src/**/*.test.ts"],
  globalSetup: "<rootDir>/test/global-setup.ts",
  testEnvironment: "node",

  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/index.ts",
  ],
  coverageDirectory: "coverage",
};

export default config;
