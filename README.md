# Updato

Decentralized update system for browser-based apps.

Updato provides:

- A GitHub Action to publish build artifacts to a `cdn` branch
- A Cloudflare Worker to serve update metadata
- A JS client library for runtime auto-updates

## Quick Start

### 1. GitHub Action

Create `.github/workflows/publish.yml`:

```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - uses: nellowtcs/updato@v1
        with:
          mode: commit
          dist_dir: dist
          build_script: npm run build
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 2. Deploy the Worker

```bash
cd Worker
npm install
npm run deploy
```

### 3. Add the Client to Your App

```html
<script src="updato.js"></script>
<script>
  var updater = Updato.init({
    repo: "user/my-app",
    mode: "commit",
    current: "__VERSION__",
    workerUrl: "https://updato.neeljaiswal23.workers.dev"
  });
  updater.checkForUpdate().then(function(result) {
    if (result && result.update) {
      updater.downloadUpdate(result).then(function() {
        updater.applyUpdate(result.files);
      });
    }
  });
</script>
```

## Architecture

- **cdn branch** - Each app has a `cdn` branch with `manifest.json`, `latest/`, and `versions/`
- **Action** - Runs in CI, builds the app, publishes to the `cdn` branch
- **Worker** - Stateless Cloudflare Worker that reads manifests and compares versions
- **Client** - JS library embedded in apps to check for and apply updates

## Publishing Modes

- **commit mode** - Each push produces an update. Version is the commit SHA.
- **version mode** - Version comes from package.json or explicit input. Uses semver comparison.

## License

MIT
