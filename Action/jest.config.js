/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@actions/core$": "<rootDir>/src/__mocks__/@actions/core.ts",
    "^@actions/github$": "<rootDir>/src/__mocks__/@actions/github.ts",
    "^@actions/exec$": "<rootDir>/src/__mocks__/@actions/exec.ts",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
};
