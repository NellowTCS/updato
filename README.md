# Updato

Push updates from GitHub, applied live in the browser with no server.

**[Live Demo](https://nellowtcs.me/updato)** | **[Documentation](https://nellowtcs.me/updato/docs)**

Updato is a decentralized update system for web apps. A GitHub Action publishes build artifacts to a CDN branch. A Cloudflare Worker tells clients when a new version exists. The client downloads and hot-swaps files without a page reload.

## How it works

```txt
Git Push  →  GitHub Action  →  CDN branch (manifest.json + assets)
                                         ↓
                              Cloudflare Worker (version checks)
                                         ↓
                              Client downloads and hot-swaps
```

## Features

- **No backend server** - Updates come from GitHub's raw content CDN. The Worker only answers version checks.
- **Live hot-swap** - Scripts, stylesheets, and images swap in place. No flash, no reload. CSS uses `CSSStyleSheet.replaceSync` for CSP-safe replacement.
- **Two modes** - Version mode uses semver comparison. Commit mode uses SHA hashes for canary rollouts.
- **Optional metrics** - localStorage-backed download telemetry. Opt-in, never sent anywhere.

## Quick start

### 1. Add the GitHub Action

```yaml
- uses: NellowTCS/updato@v1
  with:
    mode: version
    dist_dir: dist
    build_script: npm run build
```

Requires `permissions: contents: write`. Pushes build output to a `cdn` branch with a manifest.

### 2. Deploy the Worker

```bash
cd Worker
npm install
npx wrangler deploy
```

The Worker needs a KV namespace bound as `UPDATO_KV`. See the [docs](https://nellowtcs.me/updato/docs/guide/worker) for wrangler config.

### 3. Wire the client

```typescript
import { Updato } from "updato";

const updater = Updato.init(
  {
    repo: "my-org/my-app",
    mode: "version",
    current: "1.0.0",
  },
  {
    onUpdate: (info) => {
      console.log(`Version ${info.latest} available`);
    },
  },
);
```

For the full flow (check, download, apply) see the [quick start guide](https://nellowtcs.me/updato/docs/getting-started/quickstart).

## Project structure

```txt
Action/      -- GitHub Action (publishes builds to CDN branch)
Worker/      -- Cloudflare Worker (version check API)
Build/       -- Client library (npm package)
Demo/        -- Live demo app
Docs/        -- Documentation site (docmd)
```

## Publishing modes

- **version** - Version from `package.json` or explicit input. Uses semver comparison. Good for tagged releases.
- **commit** - Uses the Git commit SHA. Any push triggers an update. Good for canary builds.

## License

MIT
