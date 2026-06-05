/**
 * @jest-environment jsdom
 */

import { Updato, CheckResponse, UpdatoConfig, UpdatoEvents } from "../updato";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// jsdom doesn't provide fetch; polyfill it as a jest.fn()
const mockFetch = jest.fn<(...args: any[]) => any>();
(globalThis as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

async function createUpdato(
  config: UpdatoConfig,
  events?: UpdatoEvents,
): Promise<Updato> {
  const u = new Updato(config, events);
  await u.initialize();
  return u;
}

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

describe("Updato", () => {
  describe("constructor and init", () => {
    it("creates an instance with config", () => {
      const u = new Updato({
        repo: "owner/repo",
        mode: "commit",
        current: "abc123",
      });
      expect(u).toBeInstanceOf(Updato);
    });

    it("static init returns an Updato instance", () => {
      const u = Updato.init({
        repo: "owner/repo",
        mode: "commit",
        current: "abc123",
      });
      expect(u).toBeInstanceOf(Updato);
    });
  });

  describe("getCurrentVersion", () => {
    it("returns config version when nothing stored", () => {
      const u = new Updato({
        repo: "owner/repo",
        mode: "commit",
        current: "abc123",
      });
      expect(u.getCurrentVersion()).toBe("abc123");
    });

    it("returns stored version when available", () => {
      localStorage.setItem("updato_current", "stored-version");
      const u = new Updato({
        repo: "owner/repo",
        mode: "commit",
        current: "abc123",
      });
      expect(u.getCurrentVersion()).toBe("stored-version");
    });
  });

  describe("clearCache", () => {
    it("removes all cached entries", () => {
      localStorage.setItem("updato_current", "v1");
      localStorage.setItem("updato_cache_app.js", JSON.stringify({}));
      const u = new Updato({
        repo: "owner/repo",
        mode: "commit",
        current: "abc",
      });
      u.clearCache();
      expect(localStorage.getItem("updato_current")).toBeNull();
      expect(localStorage.getItem("updato_cache_app.js")).toBeNull();
    });
  });

  describe("checkForUpdate", () => {
    it("returns null on network error", async () => {
      mockFetch.mockRejectedValue(new Error("network"));
      const u = await createUpdato({
        repo: "owner/repo",
        mode: "commit",
        current: "abc",
      });
      const result = await u.checkForUpdate();
      expect(result).toBeNull();
    });

    it("returns null on non-ok response", async () => {
      mockFetch.mockResolvedValue(new Response("{}", { status: 500 }));
      const u = await createUpdato({
        repo: "owner/repo",
        mode: "commit",
        current: "abc",
      });
      const result = await u.checkForUpdate();
      expect(result).toBeNull();
    });

    it("returns CheckResponse on success", async () => {
      const checkData: CheckResponse = {
        mode: "commit",
        update: true,
        latest: "def456",
        current: "abc123",
        files: ["index.html", "app.js"],
        branch: "cdn",
      };
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(checkData), { status: 200 }),
      );
      const u = await createUpdato({
        repo: "owner/repo",
        mode: "commit",
        current: "abc123",
      });
      const result = await u.checkForUpdate();
      expect(result).not.toBeNull();
      expect(result!.update).toBe(true);
      expect(result!.latest).toBe("def456");
    });
  });

  describe("downloadUpdate", () => {
    it("returns false when update is false", async () => {
      const u = new Updato({
        repo: "owner/repo",
        mode: "commit",
        current: "abc",
      });
      const result = await u.downloadUpdate({
        mode: "commit",
        update: false,
        latest: "xyz",
        current: "abc",
        files: [],
        branch: "cdn",
      });
      expect(result).toBe(false);
    });

    it("downloads files and caches them", async () => {
      mockFetch.mockResolvedValue(
        new Response("file content", { status: 200 }),
      );

      const u = new Updato({
        repo: "owner/repo",
        mode: "commit",
        current: "abc",
      });

      const result = await u.downloadUpdate({
        mode: "commit",
        update: true,
        latest: "def456",
        current: "abc",
        files: ["app.js"],
        branch: "cdn",
      });

      expect(result).toBe(true);
      const cached = u.getCachedFile("app.js");
      expect(cached).toBe("file content");
      expect(u.getCurrentVersion()).toBe("def456");
    });

    it("returns false on download failure", async () => {
      mockFetch.mockResolvedValue(new Response("Not found", { status: 404 }));

      const u = new Updato({
        repo: "owner/repo",
        mode: "commit",
        current: "abc",
      });

      const result = await u.downloadUpdate({
        mode: "commit",
        update: true,
        latest: "def456",
        current: "abc",
        files: ["app.js"],
        branch: "cdn",
      });

      expect(result).toBe(false);
    });
  });

  describe("events", () => {
    it("calls onError when fetch fails in checkForUpdate", async () => {
      mockFetch.mockRejectedValue(new Error("fail"));
      const onError = jest.fn();
      const u = await createUpdato(
        { repo: "owner/repo", mode: "commit", current: "abc" },
        { onError },
      );
      await u.checkForUpdate();
      expect(onError).toHaveBeenCalled();
    });

    it("calls onProgress during download", async () => {
      mockFetch.mockResolvedValue(new Response("data", { status: 200 }));
      const onProgress = jest.fn();
      const u = new Updato(
        { repo: "owner/repo", mode: "commit", current: "abc" },
        { onProgress },
      );
      await u.downloadUpdate({
        mode: "commit",
        update: true,
        latest: "v2",
        current: "v1",
        files: ["a.js", "b.js"],
        branch: "cdn",
      });
      expect(onProgress).toHaveBeenCalledTimes(2);
    });
  });
});
