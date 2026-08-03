/** @type {import('@swc/jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@actions/core$": "<rootDir>/src/__mocks__/@actions/core.ts",
    "^@actions/github$": "<rootDir>/src/__mocks__/@actions/github.ts",
    "^@actions/exec$": "<rootDir>/src/__mocks__/@actions/exec.ts",
  },
  transform: {
    "^.+\\.ts$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
          },
          transform: {
            hidden: {
              jest: true,
            },
          },
        },
        module: {
          type: "commonjs",
        },
      },
    ],
  },
};
