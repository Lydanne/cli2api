# Dashboard Product Design Evidence

- `pnpm --filter @cli2api/dash build`: passed after splitting route pages and
  lazy-loading dashboard route components.
- `pnpm build`: passed for shared, agents-sdk, core, and dash.
- `pnpm test`: passed with 11 test files and 43 tests.
- `pnpm test:coverage`: passed; dashboard shared state is covered by focused
  unit tests and global thresholds pass.
- `pnpm test:e2e`: passed with API and dashboard flows, including Chinese
  status labels, account auth, instance creation, route binding refresh, run
  execution, and event inspection.
- `pnpm lint`: passed with zero warnings.
- `pnpm check:file-size`: passed; checked source files are within limits.
- `./deploy.sh build`: passed and built both `cli2api-api:local` and
  `cli2api-dash:local`.
- `./deploy.sh deploy`: passed; recreated API and dashboard services and waited
  for both health checks.
- `./deploy.sh status`: passed; API and dashboard containers are both healthy,
  API health returned `{"ok":true,"service":"cli2api-core"}`, and dashboard is
  available at `http://127.0.0.1:5173/`.
