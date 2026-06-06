---
title: "Client Library"
description: "Updato class, config, events, and API reference"
---

The client library is a single class with a static factory method and a handful of public methods.

## Installation

```bash
npm install updato
```

## Updato class

### `Updato.init(config, events?)`

Creates an instance and starts initialization. Returns the instance immediately; initialization runs asynchronously.

```typescript
import { Updato } from "updato";

const updater = Updato.init(
  {
    repo: "my-org/my-app",
    mode: "version",
    current: "1.0.0",
  },
  {
    onUpdate: (info) => console.log(`Update: ${info.latest}`),
    onReady: () => console.log("Ready"),
    onError: (err) => console.warn(err.message),
  },
);
```

### Config

| Field       | Type                    | Default                                    | Description                                  |
|-------------|-------------------------|--------------------------------------------|----------------------------------------------|
| `repo`      | `string`                | required                                   | GitHub `owner/repo`                          |
| `mode`      | `"commit" \| "version"` | required                                   | Comparison mode                              |
| `current`   | `string`                | required                                   | Current version (override by `localStorage`) |
| `workerUrl` | `string`                | `https://updato.neeljaiswal23.workers.dev` | Worker endpoint                              |
| `branch`    | `string`                | `"cdn"`                                    | CDN branch name                              |
| `metrics`   | `DownloadMetrics`       | `undefined`                                | Metrics collector instance                   |

### Events

| Event        | Arguments                       | When                                   |
|--------------|---------------------------------|----------------------------------------|
| `onUpdate`   | `info: CheckResponse`           | Worker reports a newer version         |
| `onReady`    | none                            | Instance initialized                   |
| `onError`    | `error: Error`                  | Any error (network, parse, cache miss) |
| `onProgress` | `percent: number, file: string` | Each file downloaded                   |

### `CheckResponse`

```typescript
interface CheckResponse {
  mode: "commit" | "version";
  update: boolean;
  latest: string;
  current: string;
  files: string[];
  modules?: string[];
  branch: string;
}
```

---

### `checkForUpdate()`

Calls the Worker's `/check` endpoint. Returns a `CheckResponse` or `null` on error.

```typescript
const result = await updater.checkForUpdate();
if (result?.update) {
  // new version available
}
```

### `downloadUpdate(info)`

Downloads each file in the response from `raw.githubusercontent.com`, caches them in `localStorage`, and sets the current version.

```typescript
const ok = await updater.downloadUpdate(result);
if (ok) updater.applyUpdate(result.files, result.modules);
```

Returns `false` if the response's `update` flag is false or any download fails.

### `applyUpdate(files, modules?)`

Reads each file from `localStorage` cache and hot-swaps it. Delegates to `hotSwap()` which handles `.js`, `.css`, `.module.js`, and image files.

If all swaps fail (e.g. none of the files are found in the DOM), the page reloads as a fallback.

### `getCachedFile(filename)`

Returns cached content for a file, or `null` if not cached or the version doesn't match.

```typescript
const css = updater.getCachedFile("styles/main.css");
if (css) {
  // manually re-apply, or just call applyUpdate()
}
```

### `getCurrentVersion()`

Returns the version from `localStorage`, falling back to the config's `current` value.

### `clearCache()`

Removes all cached files and the current version from `localStorage`.

### `metrics`

Read-only property. Returns the `DownloadMetrics` instance if one was passed in config, or `null`.

## UpdateNotification

A built-in banner that handles the update flow without custom UI code.

```typescript
import { UpdateNotification } from "updato/update-ui";

const notification = new UpdateNotification(updater, {
  heading: "Update available",
  buttonText: "Apply",
  position: "top",
  dismissable: true,
  onApply: (response) => {
    console.log(`Applied ${response.latest}`);
  },
});

notification.show(info);
```

### Options

| Field         | Type                 | Default              | Description        |
|---------------|----------------------|----------------------|--------------------|
| `container`   | `HTMLElement`        | `document.body`      | Where to mount     |
| `position`    | `"top" \| "bottom"`  | `"top"`              | Banner position    |
| `dismissable` | `boolean`            | `true`               | Show close button  |
| `buttonText`  | `string`             | `"Update"`           | Apply button label |
| `heading`     | `string`             | `"Update available"` | Message text       |
| `onApply`     | `(response) => void` | `undefined`          | Called after apply |

### Methods

| Method           | Description              |
|------------------|--------------------------|
| `show(response)` | Display the banner       |
| `hide()`         | Animate out and hide     |
| `destroy()`      | Remove from DOM entirely |

## Full Example

```typescript
import { Updato } from "updato";
import { UpdateNotification } from "updato/update-ui";

const updater = Updato.init(
  {
    repo: "my-org/my-app",
    mode: "version",
    current: "1.0.0",
  },
  {
    onUpdate: (info) => {
      new UpdateNotification(updater, {
        heading: `v${info.latest} ready`,
        onApply: () => updateLog(info.latest, "applied"),
      }).show(info);
    },
    onReady: () => console.log("ready"),
    onError: (err) => console.warn(err.message),
    onProgress: (pct, file) =>
      console.log(`${pct}% - ${file}`),
  },
);
```

## Next Steps

- [Hot-Swap Internals](./hot-swap): How script, style, and image replacement works
- [GitHub Action](./github-action): CI/CD configuration
- [Worker](./worker): Self-hosted worker deployment
