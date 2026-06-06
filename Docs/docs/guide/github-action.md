---
title: "GitHub Action"
description: "Action inputs, workflow setup, and deployment reference"
---

The Updato Action publishes build artifacts to a CDN branch with a version manifest.

## Usage

```yaml
- uses: NellowTCS/updato@v1
  with:
    mode: version
    dist_dir: dist
    build_script: npm run build
```

## Inputs

| Input          | Required | Default                             | Description                                             |
|----------------|----------|-------------------------------------|---------------------------------------------------------|
| `mode`         | yes      | `"commit"`                          | `"version"` or `"commit"`                               |
| `dist_dir`     | yes      | `"dist"`                            | Build output directory relative to repo root            |
| `build_script` | no       | `""`                                | Command to run before publishing (e.g. `npm run build`) |
| `version`      | no       | package.json `version`              | Explicit version for `version` mode                     |
| `cdn_branch`   | no       | `"cdn"`                             | Target branch for CDN artifacts                         |
| `github_token` | no       | `""`                                | GitHub token for pushing to CDN branch                  |
| `user_name`    | no       | `"updato"`                          | Git user name for the commit                            |
| `user_email`   | no       | `"updato@users.noreply.github.com"` | Git user email                                          |

The Action needs a GitHub token with `contents: write` access. You can pass it explicitly or rely on the `GITHUB_TOKEN` environment variable (auto-available in most runners with `permissions: contents: write`).

```yaml
- uses: NellowTCS/updato@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Mode: `version`

Reads the version from `package.json` or the explicit `version` input. Versions are compared semantically: `1.2.0 > 1.1.0`. Files are published under `versions/v1.2.0/`.

### Mode: `commit`

Uses the current Git commit SHA as the version. Any SHA change triggers an update. Files are published under `versions/<sha>/`.

## Required permissions

The Action needs contents write access to push the CDN branch:

```yaml
permissions:
  contents: write
```

## Full Workflow

```yaml
name: Deploy
on:
  push:
    branches: [main]

permissions:
  contents: write

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
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

## What gets pushed

After the Action runs, the CDN branch looks like:

```txt
cdn/
  manifest.json
  latest/
    index.html
    assets/
      main.js
      main.css
  versions/
    v1.0.0/
      index.html
      assets/
        main.js
        main.css
    v1.0.1/
      index.html
      assets/
        main.js
        main.css
```

### manifest.json

```json
{
  "app": "my-app",
  "mode": "version",
  "latest": "1.0.1",
  "files": [
    "index.html",
    "assets/main.js",
    "assets/main.css"
  ],
  "modules": ["assets/main.js"],
  "timestamp": 1719000000
}
```

The `files` array lists every file in the build output. The `modules` array lists files that are ES modules (`<script type="module">`), detected by scanning HTML for module script tags. Files listed in `modules` are passed to `swapScript` with `isModule: true`.

## Next Steps

- [Client Library](./client-library): Wire the other end
- [Manifest](./manifest): Manifest format reference
- [Worker](./worker): Deploy your own worker
