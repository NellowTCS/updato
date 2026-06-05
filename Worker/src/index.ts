/// <reference types="@cloudflare/workers-types" />

import { validateManifest } from "./manifest";
import type { Manifest } from "./manifest";
import { RateLimiter, getClientIp } from "./rate-limit";

interface CheckResponse {
  mode: "commit" | "version";
  update: boolean;
  latest: string;
  current: string;
  files: string[];
  modules?: string[];
  branch: string;
}

interface Env {
  UPDATO_KV: KVNamespace;
  UPDATO_CACHE_TTL?: string;
}

const rateLimiter = new RateLimiter();
const DEFAULT_CACHE_TTL = 300;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const CACHE_CONTROL = "public, max-age=60, s-maxage=300";

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

function manifestCacheKey(repo: string, branch: string): string {
  return `manifest:${branch}:${repo}`;
}

export async function fetchManifest(
  repo: string,
  branch: string,
  kv: KVNamespace,
  cacheTtl: number,
): Promise<Manifest> {
  const cacheKey = manifestCacheKey(repo, branch);

  const cached = await kv.get(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as Manifest;
      const result = validateManifest(parsed);
      if (result.valid) return result.manifest;
    } catch {
      // corrupted cache entry, fall through to re-fetch
    }
  }

  const url = `https://raw.githubusercontent.com/${repo}/${branch}/manifest.json`;
  const response = await fetch(url, {
    headers: { "User-Agent": "updato-worker/1.0" },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch manifest for "${repo}": ${response.status} ${response.statusText}`,
    );
  }

  const raw = (await response.json()) as unknown;
  const result = validateManifest(raw);

  if (!result.valid) {
    const detail = result.errors
      .map((e) => `${e.field}: ${e.message}`)
      .join("; ");
    throw new Error(`Invalid manifest for "${repo}": ${detail}`);
  }

  await kv.put(cacheKey, JSON.stringify(result.manifest), {
    expirationTtl: cacheTtl,
  });

  return result.manifest;
}

export function parseSemver(version: string): number[] {
  return version.split(".").map((part) => {
    const num = parseInt(part, 10);
    return Number.isNaN(num) ? 0 : num;
  });
}

export function isNewerVersion(current: string, latest: string): boolean {
  if (current === latest) return false;
  const cur = parseSemver(current);
  const lat = parseSemver(latest);
  const maxLen = Math.max(cur.length, lat.length);
  for (let i = 0; i < maxLen; i++) {
    const a = cur[i] ?? 0;
    const b = lat[i] ?? 0;
    if (a < b) return true;
    if (a > b) return false;
  }
  return false;
}

export async function handleCheck(
  repo: string,
  branch: string,
  current: string,
  kv: KVNamespace,
  cacheTtl: number,
): Promise<Response> {
  if (!current) {
    return errorResponse("Missing 'current' query parameter.");
  }

  let manifest: Manifest;
  try {
    manifest = await fetchManifest(repo, branch, kv, cacheTtl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(message, 502);
  }

  let update: boolean;
  if (manifest.mode === "commit") {
    update = current !== manifest.latest;
  } else {
    update = isNewerVersion(current, manifest.latest);
  }

  const response: CheckResponse = {
    mode: manifest.mode,
    update,
    latest: manifest.latest,
    current,
    files: manifest.files,
    modules: manifest.modules,
    branch,
  };

  return jsonResponse(response);
}

export async function handleManifest(
  repo: string,
  branch: string,
  kv: KVNamespace,
  cacheTtl: number,
): Promise<Response> {
  try {
    const manifest = await fetchManifest(repo, branch, kv, cacheTtl);
    return jsonResponse(manifest);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(message, 502);
  }
}

export function parseUrl(url: URL): {
  repo: string;
  branch: string;
  current: string;
} {
  return {
    repo: url.searchParams.get("repo") || "",
    branch: url.searchParams.get("branch") || "cdn",
    current: url.searchParams.get("current") || "",
  };
}

export function validateRepo(repo: string): boolean {
  return /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(repo);
}

export function validateBranch(branch: string): boolean {
  return /^[a-zA-Z0-9_./-]+$/.test(branch) && branch.length <= 100;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return errorResponse("Method not allowed.", 405);
    }

    const ip = getClientIp(request);
    const { allowed, retryAfter } = await rateLimiter.check(ip, env.UPDATO_KV);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please slow down." }),
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
          },
        },
      );
    }

    const cacheTtl = env.UPDATO_CACHE_TTL
      ? parseInt(env.UPDATO_CACHE_TTL, 10) || DEFAULT_CACHE_TTL
      : DEFAULT_CACHE_TTL;

    const { repo, branch, current } = parseUrl(url);

    if (!repo) {
      return errorResponse("Missing 'repo' query parameter.");
    }

    if (!validateRepo(repo)) {
      return errorResponse("Invalid repo format. Expected 'owner/repo'.", 400);
    }

    if (!validateBranch(branch)) {
      return errorResponse("Invalid branch name.", 400);
    }

    const path = url.pathname.replace(/\/+$/, "") || "/";

    switch (path) {
      case "/manifest":
        return handleManifest(repo, branch, env.UPDATO_KV, cacheTtl);
      case "/check":
        return handleCheck(repo, branch, current, env.UPDATO_KV, cacheTtl);
      default:
        return errorResponse(
          `Unknown endpoint "${path}". Use /manifest or /check.`,
          404,
        );
    }
  },
};
