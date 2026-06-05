# TODO

- [ ] Docs
- [ ] A demo
- [ ] Update README with detailed usage examples for the action

- [X] Support multiple CDN branches (branch per environment)
- [X] Notify users when an update is available (e.g., alert banner, embedded UI)
- [ ] Add support for `file` vs. `module` types in the Action
- [ ] Gather performance metrics for update download times (opt in if i ever want to collect ofc i'm not a weirdo, i don't want your data)

- [ ] Attach the Cloudflare worker to a custom domain? (routes)

- [ ] Set up unit tests for the GitHub Action, Cloudflare Worker, and JS client library
- [ ] Create a CI workflow to run tests and linting

- [ ] Implement a release workflow that tags the repo and publishes the action
- [ ] Auto‑generate changelog for each release
- [ ] Auto‑create tags via GitHub Actions when a release is drafted
- [ ] Remove debug logs from the production client
- [ ] Enable GitHub security alerts & dependency graph
- [ ] Publish the client library as an npm package
