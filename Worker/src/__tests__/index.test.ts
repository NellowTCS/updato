/**
 * @jest-environment node
 */

// Mock Request/Response for the Worker runtime in Node
import { validateManifest } from "../manifest";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// We need access to the module's internal functions.
// Since they're not all exported (handleCheck, handleManifest etc. are
// used only inside the default export), we test the public API:
// validateBranch, validateRepo, parseUrl, isNewerVersion, parseSemver,
// jsonResponse, errorResponse are all available via the module.

// Re-import the module's default handler and helpers
import worker, {
  validateBranch,
  validateRepo,
  jsonResponse,
  errorResponse,
} from "../index";
import type { Manifest } from "../manifest";

// Also test the pure helpers

describe("validateRepo", () => {
  it("accepts valid owner/repo", () => {
    expect(validateRepo("owner/repo")).toBe(true);
    expect(validateRepo("my-org/my_repo")).toBe(true);
    expect(validateRepo("a/b")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(validateRepo("")).toBe(false);
    expect(validateRepo("no-slash")).toBe(false);
    expect(validateRepo("/repo")).toBe(false);
    expect(validateRepo("owner/")).toBe(false);
  });
});

describe("validateBranch", () => {
  it("accepts valid branch names", () => {
    expect(validateBranch("cdn")).toBe(true);
    expect(validateBranch("feature/my-branch")).toBe(true);
  });

  it("rejects invalid branch names", () => {
    expect(validateBranch("")).toBe(false);
    expect(validateBranch("branch with spaces")).toBe(false);
  });
});

describe("jsonResponse / errorResponse", () => {
  it("creates a JSON response", () => {
    const res = jsonResponse({ ok: true });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("creates an error response with given status", () => {
    const res = errorResponse("not found", 404);
    expect(res.status).toBe(404);
  });
});

describe("isNewerVersion (imported via worker module)", () => {
  // isNewerVersion is not directly exported, but fetchManifest uses it.
  // We test it through the parsed response behavior:
  // Since it's not exported, we test directly in the semver utility.
  // We can import parseSemver if needed:
});

// The worker's module-level parseSemver and isNewerVersion are not exported.
// We test the worker through its default handler (fetch).
// For isNewerVersion, we validate indirectly through the /check endpoint.

describe("worker fetch handler", () => {
  let kv: KVNamespace;

  beforeEach(() => {
    const store = new Map<string, string>();
    const validManifest: Manifest = {
      app: "test-app",
      mode: "version",
      latest: "2.0.0",
      files: ["index.html"],
      timestamp: Date.now() / 1000,
    };
    store.set("manifest:cdn:owner/repo", JSON.stringify(validManifest));

    kv = {
      get: jest.fn(async (key: string) => store.get(key) ?? null),
      put: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      delete: jest.fn(),
      list: jest.fn(),
      getWithMetadata: jest.fn(),
    } as unknown as KVNamespace;
  });

  it("returns 400 when repo is missing", async () => {
    const req = new Request("https://updato.test/check");
    const env = { UPDATO_KV: kv };
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toContain("Missing 'repo'");
  });

  it("returns 400 for invalid repo format", async () => {
    const req = new Request("https://updato.test/check?repo=bad");
    const env = { UPDATO_KV: kv };
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid branch", async () => {
    const req = new Request(
      "https://updato.test/check?repo=owner/repo&branch=bad branch",
    );
    const env = { UPDATO_KV: kv };
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(400);
  });

  it("returns check response for valid request", async () => {
    const req = new Request(
      "https://updato.test/check?repo=owner/repo&current=1.0.0",
    );
    const env = { UPDATO_KV: kv };
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.update).toBe(true);
    expect(body.latest).toBe("2.0.0");
    expect(body.current).toBe("1.0.0");
  });

  it("returns no update when already latest", async () => {
    const req = new Request(
      "https://updato.test/check?repo=owner/repo&current=2.0.0",
    );
    const env = { UPDATO_KV: kv };
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.update).toBe(false);
  });

  it("returns 404 for unknown endpoint", async () => {
    const req = new Request("https://updato.test/unknown?repo=owner/repo");
    const env = { UPDATO_KV: kv };
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(404);
  });

  it("handles OPTIONS preflight", async () => {
    const req = new Request("https://updato.test/check", { method: "OPTIONS" });
    const env = { UPDATO_KV: kv };
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(204);
  });

  it("rejects non-GET methods", async () => {
    const req = new Request("https://updato.test/check?repo=owner/repo", {
      method: "POST",
    });
    const env = { UPDATO_KV: kv };
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(405);
  });
});
