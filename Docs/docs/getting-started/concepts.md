---
title: "Core Concepts"
description: "How Updato works: Action, Worker, and Client"
---

Updato has three pieces that work together: a GitHub Action, a Cloudflare Worker, and a client library. Each has a single job.

## The Three Pieces

### GitHub Action

The Action runs in your CI pipeline. It:

- Runs your build script
- Copies the output to a dedicated CDN branch (default `cdn`)
- Writes a `manifest.json` with the version, file list, and module flags
- Pushes the branch

The CDN branch holds every version under `versions/<version>/` and a `latest/` alias. The manifest is always at the root.

### Cloudflare Worker

The Worker is a lightweight HTTP API with two endpoints:

- `GET /check?repo=owner/name&branch=cdn&current=1.0.0` -- checks if a newer version exists
- `GET /manifest?repo=owner/name&branch=cdn` -- returns the current manifest

It fetches and caches the manifest from GitHub's raw CDN, then compares versions. In version mode it uses semantic version comparison. In commit mode it uses exact SHA matching.

The Worker also rate-limits per IP (60 requests per minute by default) and caches the manifest in KV.

### Client Library

The client runs in the browser. It:

- Calls the Worker periodically to check for updates
- Downloads new files from GitHub's raw content CDN
- Caches them in `localStorage`
- Hot-swaps scripts, stylesheets, and images without a reload

The library is CSP-safe, uses no inline styles, and tracks download metrics if enabled.

## The Update Flow

```txt
Git Push triggers the GitHub Action
              ↓
         cdn branch (manifest.json + assets)
              ↓
         Cloudflare Worker (cached manifest)
              ↑ ↓
         Client checks /check endpoint
              ↓
         Downloads new files from raw.githubusercontent.com
              ↓
         Hot-swaps in the DOM
```

1. You push to your repo. The Action builds and deploys to the `cdn` branch.
2. A client calls `checkForUpdate()`. The Worker reads the manifest, compares the client's current version, and returns `{ update: true, files: [...], latest: "1.0.1" }`.
3. The client calls `downloadUpdate()`, which fetches each file from `raw.githubusercontent.com` and stores them in `localStorage`.
4. The client calls `applyUpdate()`, which reads the cached files and hot-swaps them into the page.

## Modes

### Version mode

Compares versions semantically: `1.2.0 > 1.1.0`. Good for tagged releases and stable apps. The version is read from `package.json` or set explicitly in the Action config.

### Commit mode

Compares Git SHA hashes: any difference means an update. Good for canary builds and staging environments.

## Storage

The client stores everything in `localStorage`:

| Key                   | Purpose                       |
|-----------------------|-------------------------------|
| `updato_current`      | Current version string        |
| `updato_cache_<path>` | Cached file content per path  |
| `updato:metrics`      | Download metrics (if enabled) |

The `clearCache()` method removes all cache keys and the current version. The `DownloadMetrics.clear()` method resets metrics separately.

## Next Steps

- [Quick Start](./quickstart): Get everything running
- [Client Library](../guide/client-library): Config, events, and API
- [GitHub Action](../guide/github-action): Action inputs reference
