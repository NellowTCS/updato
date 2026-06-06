---
title: "Manifest"
description: "Manifest format, validation, and lifecycle"
---

The manifest is a JSON file at the root of the CDN branch. The Action writes it; the Worker validates and caches it.

## Format

```typescript
interface Manifest {
  app: string;
  mode: "commit" | "version";
  latest: string;
  files: string[];
  modules?: string[];
  timestamp: number;
}
```

| Field       | Type                    | Description                                      |
|-------------|-------------------------|--------------------------------------------------|
| `app`       | `string`                | Repository name                                  |
| `mode`      | `"commit" \| "version"` | Comparison mode                                  |
| `latest`    | `string`                | Current version string                           |
| `files`     | `string[]`              | All file paths relative to the version directory |
| `modules`   | `string[]`              | Subset of files that are ES modules (optional)   |
| `timestamp` | `number`                | Unix timestamp in seconds                        |

## Path structure

Files in `files` are relative to `versions/<latest>/` on the CDN branch. The client fetches them from:

```txt
https://raw.githubusercontent.com/<repo>/<cdn-branch>/versions/<latest>/<file>
```

For example, if `latest` is `"1.0.1"` and `files` contains `"assets/main.js"`, the client downloads:

```txt
https://raw.githubusercontent.com/my-org/my-app/cdn/versions/v1.0.1/assets/main.js
```

## Module detection

The Action scans all HTML files in the build output for `<script type="module" src="...">` tags. Matching files are listed in the `modules` array. The client uses this to pass `isModule: true` to `swapScript`, which creates the replacement with `type="module"`.

This field is optional. If no module scripts are found, it is omitted from the manifest.

## Validation

The Worker validates every manifest it reads, both from the upstream GitHub fetch and from the KV cache.

```typescript
type ValidationResult =
  | { valid: true; manifest: Manifest }
  | { valid: false; errors: ValidationError[] };
```

Validation checks:

- `app` is a non-empty string
- `mode` is exactly `"commit"` or `"version"`
- `latest` is a non-empty string
- `files` is an array of strings
- `modules` (if present) is an array of strings
- `timestamp` is a finite positive number

Invalid manifests return a 502 error from the Worker with the validation details.

## Caching

The Worker caches the manifest in KV with a configurable TTL (default 300 seconds). Set `UPDATO_CACHE_TTL` environment variable on the Worker to change it.

## Next Steps

- [GitHub Action](./github-action): How the manifest is generated
- [Worker](./worker): How the manifest is served and cached
