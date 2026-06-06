---
title: "Worker"
description: "Deploy and configure the Cloudflare Worker"
---

The Worker is a lightweight HTTP API that checks versions and serves manifest data. It's the only server-side component.

## Endpoints

### `GET /check`

Primary endpoint called by the client.

| Param     | Required | Description                  |
|-----------|----------|------------------------------|
| `repo`    | yes      | GitHub `owner/repo`          |
| `branch`  | no       | CDN branch (default `"cdn"`) |
| `current` | yes      | Client's current version     |

Response:

```json
{
  "mode": "version",
  "update": true,
  "latest": "1.0.1",
  "current": "1.0.0",
  "files": ["index.html", "assets/main.js"],
  "modules": ["assets/main.js"],
  "branch": "cdn"
}
```

Returns `{ update: false }` if the client is already on the latest version.

### `GET /manifest`

Returns the raw manifest for debugging or custom integrations.

| Param    | Required | Description                  |
|----------|----------|------------------------------|
| `repo`   | yes      | GitHub `owner/repo`          |
| `branch` | no       | CDN branch (default `"cdn"`) |

## Version comparison

**Version mode** splits the version string on `.` and compares numerically. `"1.10.0" > "1.9.0"`. Non-numeric segments are treated as `0`.

**Commit mode** does an exact string comparison. Any difference means an update.

## Caching

The Worker caches the fetched manifest in KV under the key `manifest:<branch>:<repo>`. The default TTL is 300 seconds. Set the `UPDATO_CACHE_TTL` environment variable to override.

If the cache is stale or missing, the Worker fetches the manifest from `https://raw.githubusercontent.com/<repo>/<branch>/manifest.json`.

## Rate limiting

Default: 60 requests per minute per IP. Configurable by editing `RateLimitConfig` in `rate-limit.ts`. Uses KV to track window state.

## Deployment

```bash
cd worker
npm install
npx wrangler deploy
```

### KV namespace

```toml
[[kv_namespaces]]
binding = "UPDATO_KV"
id = "<your-namespace-id>"
```

## Self-hosting

The Worker handles CORS, caching, and error responses automatically. Deploy it under your own Cloudflare account to control the URL and rate limits.

## Next Steps

- [Manifest](./manifest): Format and validation
- [Client Library](./client-library): The client that talks to this worker
