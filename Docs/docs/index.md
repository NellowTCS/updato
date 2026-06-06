---
title: "Updato"
description: "Push updates from GitHub, applied live in the browser with no server"
---

**Updato** is a decentralized update system for web apps. You push build artifacts to a CDN branch in your GitHub repo. A Cloudflare Worker tells clients when a new version exists. The client downloads and hot-swaps files without a page reload.

The whole pipeline has three pieces: a GitHub Action that deploys builds, a Worker that checks versions, and a client library that applies updates live.

## What it solves

You ship a static web app and need to update it without asking users to refresh. Normally that means a WebSocket server, a bunch of state management, and a deployment pipeline that knows about both.

Updato replaces that with a GitHub repo, a config file, and four lines of client code. The CDN branch is your deployment target. The Worker is the version authority. The client handles the rest.

## Features

::: card Decentralized
No backend server. Updates come from your GitHub repo's raw content CDN. The Worker only answers version checks.
:::

::: card Live Hot-Swap
Scripts, stylesheets, and images swap in place using `CSSStyleSheet.replaceSync` and DOM replacement. No flash, no reload.
:::

::: card Two Modes
**Version mode** uses semantic version comparison (`1.2.0` > `1.1.0`). **Commit mode** compares SHA hashes for canary-style rollouts.
:::

::: card Optional Metrics
Built-in localStorage-backed download telemetry. File size, duration, and URL for each downloaded asset. Opt-in, never sent anywhere.
:::

::: card CSP-Safe
CSS hot-swap uses `CSSStyleSheet.replaceSync` and `adoptedStyleSheets` . No inline `<style>` tags, no `data:` URIs. Works with strict Content Security Policy.
:::

## Quick Example

**Client-side:**

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

**Deploy a new version (GitHub Action):**

```yaml
- uses: NellowTCS/updato@v1
  with:
    mode: version
    dist_dir: dist
    build_script: npm run build
```

Push or merge to your default branch. The Action builds, copies to a `cdn` branch, writes a manifest, and the Worker routes clients to the new assets.

## Next Steps

- [Quick Start](./getting-started/quickstart): Install and wire everything together
- [Core Concepts](./getting-started/concepts): How the three pieces fit
- [Client Library](./guide/client-library): Full API reference
- [GitHub Action](./guide/github-action): Action inputs and workflow setup
