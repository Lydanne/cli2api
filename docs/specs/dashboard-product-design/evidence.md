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
- Usability follow-up after operator feedback:
  - Renamed Chinese navigation from internal object names to serving-chain
    terms: client keys, models, dispatch rules, upstream accounts, executors, and
    calls.
  - Added an overview setup-progress panel that marks completed steps and links
    to the next incomplete configuration area.
  - Added a client-key input to the calls page so test calls do not depend on a
    token being created in the same browser session.
  - Re-ran `pnpm build`, `pnpm test`, `pnpm test:coverage`, `pnpm test:e2e`,
    `pnpm lint`, `pnpm check:file-size`, and `./deploy.sh deploy`.
- Data cleanup follow-up after operator feedback:
  - Added admin delete APIs for unused client keys, models, upstream accounts,
    executors, and extra dashboard users.
  - Preserved audit history by returning 409 when a key/model/executor has run
    or usage history; those records stay revocable or disableable instead.
  - Added dashboard delete buttons and E2E coverage for deleting test-created
    accounts, models, and users.
  - Re-ran `pnpm build`, `pnpm test`, `pnpm test:coverage`, `pnpm test:e2e`,
    `pnpm lint`, `pnpm check:file-size`, and `./deploy.sh deploy`.
- Setup-progress visual follow-up after operator feedback:
  - Replaced the overview setup-progress card grid with a full-width operational
    stepper: status, next action, progress bar, and six clickable setup steps.
  - Verified desktop and mobile layouts in the local dashboard; both measured no
    horizontal overflow.
  - Re-ran `pnpm --filter @cli2api/dash build`, `./deploy.sh deploy`,
    `./deploy.sh status`, `pnpm lint`, `pnpm test`, `pnpm test:coverage`, and
    `pnpm test:e2e`.
