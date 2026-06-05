import { validateManifest } from "../manifest";
import { describe, expect, it } from "@jest/globals";

describe("validateManifest", () => {
  it("accepts a valid manifest", () => {
    const result = validateManifest({
      app: "my-app",
      mode: "commit",
      latest: "abc123",
      files: ["index.html", "app.js"],
      timestamp: 1000,
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.manifest.app).toBe("my-app");
    }
  });

  it("rejects non-object input", () => {
    const result = validateManifest(null);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toHaveLength(1);
    }
  });

  it("rejects missing app", () => {
    const result = validateManifest({
      mode: "commit",
      latest: "abc",
      files: [],
      timestamp: 1,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects empty app", () => {
    const result = validateManifest({
      app: "",
      mode: "commit",
      latest: "abc",
      files: [],
      timestamp: 1,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid mode", () => {
    const result = validateManifest({
      app: "x",
      mode: "invalid",
      latest: "abc",
      files: [],
      timestamp: 1,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0].message).toContain("invalid");
    }
  });

  it("accepts version mode", () => {
    const result = validateManifest({
      app: "x",
      mode: "version",
      latest: "1.0.0",
      files: [],
      timestamp: 1,
    });
    expect(result.valid).toBe(true);
  });

  it("rejects missing latest", () => {
    const result = validateManifest({
      app: "x",
      mode: "commit",
      files: [],
      timestamp: 1,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects non-array files", () => {
    const result = validateManifest({
      app: "x",
      mode: "commit",
      latest: "abc",
      files: "not-array",
      timestamp: 1,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects files with non-string items", () => {
    const result = validateManifest({
      app: "x",
      mode: "commit",
      latest: "abc",
      files: ["ok", 42],
      timestamp: 1,
    });
    expect(result.valid).toBe(false);
  });

  it("accepts optional modules field", () => {
    const result = validateManifest({
      app: "x",
      mode: "commit",
      latest: "abc",
      files: ["app.js"],
      modules: ["app.js"],
      timestamp: 1,
    });
    expect(result.valid).toBe(true);
  });

  it("rejects modules with non-string items", () => {
    const result = validateManifest({
      app: "x",
      mode: "commit",
      latest: "abc",
      files: [],
      modules: [42],
      timestamp: 1,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects non-number timestamp", () => {
    const result = validateManifest({
      app: "x",
      mode: "commit",
      latest: "abc",
      files: [],
      timestamp: "later",
    });
    expect(result.valid).toBe(false);
  });

  it("rejects non-positive timestamp", () => {
    const result = validateManifest({
      app: "x",
      mode: "commit",
      latest: "abc",
      files: [],
      timestamp: 0,
    });
    expect(result.valid).toBe(false);
  });

  it("returns multiple errors", () => {
    const result = validateManifest({});
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    }
  });
});
