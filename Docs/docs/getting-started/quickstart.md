---
title: "Quick Start"
description: "Set up Updato end to end in about 10 minutes"
---

This guide gets you from zero to a deployed update in about 10 minutes. You'll set up the Worker, configure the Action, and wire the client.

## Before You Start

You need:

- A GitHub repository with a static web app (or the Demo in this repo)
- Node.js 18+ and npm
- A Cloudflare account for the Worker
- `wrangler` CLI installed (`npm install -g wrangler`)

## Step 1: Deploy the Worker

The Worker handles version-check requests from clients. It reads the manifest from your CDN branch and tells clients whether an update exists.

```bash
cd worker
npm install
npx wrangler deploy
```

You'll get a URL like `https://updato.your-name.workers.dev`. Keep it.

The Worker needs a KV namespace bound as `UPDATO_KV` for caching and rate limiting:

```toml
[[kv_namespaces]]
binding = "UPDATO_KV"
id = "<your-namespace-id>"
```

## Step 2: Add the Action

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci

      - uses: NellowTCS/updato@v1
        with:
          mode: version
          dist_dir: dist
          build_script: npm run build
          cdn_branch: cdn
```

The Action:

1. Runs your build script
2. Copies output to `latest/` and `versions/<version>/` on the `cdn` branch
3. Writes a `manifest.json` describing the release
4. Pushes the branch

## Step 3: Wire the client

Install the package:

```bash
npm install updato
```

Add to your app's entry point:

```typescript
import { Updato } from "updato";

const updater = Updato.init(
  {
    repo: "my-org/my-app",
    workerUrl: "https://updato.your-name.workers.dev",
    mode: "version",
    current: "1.0.0",
  },
  {
    onUpdate: (info) => {
      const banner = document.createElement("div");
      banner.textContent = `Update ${info.latest} available`;
      banner.onclick = () => handleUpdate(info);
      document.body.prepend(banner);
    },
    onError: (err) => console.warn(err.message),
  },
);

async function handleUpdate(info) {
  const ok = await updater.downloadUpdate(info);
  if (ok) updater.applyUpdate(info.files, info.modules);
}
```

If you want the built-in banner UI instead of building your own:

```typescript
import { UpdateNotification } from "updato/update-ui";
// in onUpdate:
new UpdateNotification(updater).show(info);
```

## Step 4: Publish a version

Push something to your app:

```bash
git add .
git commit -m "v1.0.1"
git tag v1.0.1
git push && git push --tags
```

The Action picks it up, builds, and deploys to the `cdn` branch. The next time a client checks, they get the update.

## What just happened

1. The Action built your app and pushed the output to the `cdn` branch
2. It wrote `versions/v1.0.1/*` and updated `manifest.json` with `latest: "1.0.1"`
3. Your client called `checkForUpdate()`, which hit the Worker
4. The Worker fetched the manifest, compared versions, and returned `{ update: true, latest: "1.0.1" }`
5. Your client downloaded the new files and hot-swapped them

## Next Steps

- [Core Concepts](./concepts): Architecture deep-dive
- [Client Library](../guide/client-library): All config and event options
- [GitHub Action](../guide/github-action): Full input reference
