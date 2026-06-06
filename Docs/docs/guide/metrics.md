---
title: "Download Metrics"
description: "Track download performance with localStorage-backed telemetry"
---

The `DownloadMetrics` class records timing and size data for every file downloaded by `downloadUpdate()`. All data stays in `localStorage` and is never sent anywhere automatically.

## Usage

```typescript
import { DownloadMetrics } from "@nellowtcs/updato/metrics";

const metrics = new DownloadMetrics();

const updater = Updato.init({
  repo: "my-org/my-app",
  mode: "version",
  current: "1.0.0",
  metrics,
});
```

## Data

Each entry recorded:

```typescript
interface MetricsEntry {
  filename: string;
  startTime: number;
  endTime: number;
  duration: number;
  fileSize: number;
  url: string;
}
```

| Field       | Description                             |
|-------------|-----------------------------------------|
| `filename`  | File path relative to version directory |
| `startTime` | `performance.now()` before fetch        |
| `endTime`   | `performance.now()` after fetch         |
| `duration`  | `endTime - startTime` in milliseconds   |
| `fileSize`  | Content length in bytes                 |
| `url`       | Full download URL                       |

## Methods

| Method            | Description                                     |
|-------------------|-------------------------------------------------|
| `addEntry(entry)` | Record one download                             |
| `export()`        | Get all entries as an array                     |
| `exportJson()`    | Get all entries formatted as JSON string        |
| `clear()`         | Remove all entries from memory and localStorage |

## Privacy

Metrics are opt-in only. Pass a `DownloadMetrics` instance to the `Updato` config to enable recording. Without it, no data is collected. The data is never transmitted to any server by the library.

## Next Steps

- [Client Library](./client-library): Full config reference
- [GitHub Action](./github-action): Set up the deployment pipeline
