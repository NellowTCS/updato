interface Manifest {
  app: string;
  mode: "commit" | "version";
  latest: string;
  files: string[];
  timestamp: number;
}

interface CheckResponse {
  mode: "commit" | "version";
  update: boolean;
  latest: string;
  current: string;
  files: string[];
}

interface Env {
  UPDATO_CACHE_TTL?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

async function fetchManifest(repo: string): Promise<Manifest> {
  const url = `https://raw.githubusercontent.com/${repo}/cdn/manifest.json`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "updato-worker/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch manifest for "${repo}": ${response.status} ${response.statusText}`
    );
  }

  const manifest = (await response.json()) as Manifest;

  if (manifest.mode !== "commit" && manifest.mode !== "version") {
    throw new Error(
      `Invalid mode "${manifest.mode}" in manifest for "${repo}".`
    );
  }

  if (!manifest.latest || !Array.isArray(manifest.files)) {
    throw new Error(`Invalid manifest structure for "${repo}".`);
  }

  return manifest;
}

function parseSemver(version: string): number[] {
  return version.split(".").map((part) => {
    const num = parseInt(part, 10);
    return Number.isNaN(num) ? 0 : num;
  });
}

function isNewerVersion(current: string, latest: string): boolean {
  if (current === latest) return false;
  const currentParts = parseSemver(current);
  const latestParts = parseSemver(latest);
  const maxLen = Math.max(currentParts.length, latestParts.length);
  for (let i = 0; i < maxLen; i++) {
    const a = currentParts[i] ?? 0;
    const b = latestParts[i] ?? 0;
    if (a < b) return true;
    if (a > b) return false;
  }
  return false;
}

async function handleCheck(
  repo: string,
  current: string
): Promise<Response> {
  if (!current) {
    return errorResponse("Missing 'current' query parameter.");
  }

  let manifest: Manifest;
  try {
    manifest = await fetchManifest(repo);
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
  };

  return jsonResponse(response);
}

async function handleManifest(repo: string): Promise<Response> {
  let manifest: Manifest;
  try {
    manifest = await fetchManifest(repo);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(message, 502);
  }
  return jsonResponse(manifest);
}

function parseUrl(url: URL): { repo: string; current: string } {
  const repo = url.searchParams.get("repo") || "";
  const current = url.searchParams.get("current") || "";
  return { repo, current };
}

function validateRepo(repo: string): boolean {
  return /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(repo);
}

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return errorResponse("Method not allowed.", 405);
    }

    const { repo, current } = parseUrl(url);

    if (!repo) {
      return errorResponse("Missing 'repo' query parameter.");
    }

    if (!validateRepo(repo)) {
      return errorResponse(
        "Invalid repo format. Expected 'owner/repo'.",
        400
      );
    }

    const path = url.pathname.replace(/\/+$/, "") || "/";

    switch (path) {
      case "/manifest": {
        return handleManifest(repo);
      }
      case "/check": {
        return handleCheck(repo, current);
      }
      default: {
        return errorResponse(
          `Unknown endpoint "${path}". Use /manifest or /check.`,
          404
        );
      }
    }
  },
};
