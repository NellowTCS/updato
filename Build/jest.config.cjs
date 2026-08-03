/** @type {import('@swc/jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
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
  setupFiles: ["<rootDir>/jest.setup.js"],
};
