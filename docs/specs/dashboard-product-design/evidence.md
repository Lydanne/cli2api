# Dashboard Product Design Evidence

## Client Key Link Copy Follow-Up

- Added a client-key page call-address panel that displays the current
  same-origin OpenAI-compatible base URL ending in `/v1`.
- Added an icon copy action for the base URL. Stored API key plaintext remains
  hidden; the existing created-token message still only shows the token once
  immediately after creation.
- Added `buildClientBaseUrl` unit coverage for normal origins and trailing
  slash normalization.
- Extended the dashboard E2E flow to assert the key page shows
  `http://127.0.0.1:4517/v1`, copies it, and shows `已复制`.
- TDD red: `pnpm --filter @cli2api/dash test -- src/lib/client-links.spec.ts`
  failed because `./client-links` was missing.
- TDD green: `pnpm --filter @cli2api/dash test -- src/lib/client-links.spec.ts`
  passed with 6 files and 19 tests.
- Browser QA on `http://127.0.0.1:4517/#/api-keys`: displayed
  `http://127.0.0.1:4517/v1`, copy feedback became visible, and no horizontal
  overflow was measured at 1280 px (`clientWidth=1280`, `scrollWidth=1280`,
  `bodyScrollWidth=1280`).
- `pnpm lint`: initially failed on `clearTimeout` and `navigator` globals in
  `ApiKeysPage.vue`; fixed by using `window.clearTimeout`,
  `window.setTimeout`, and `window.navigator`, then `pnpm lint` passed with
  zero warnings.
- `pnpm test`: passed with 13 files and 69 tests.
- `pnpm test:coverage`: passed with 83.37% statements, 68.77% branches,
  88.94% functions, and 83.98% lines.
- `pnpm test:e2e`: passed with 2 Playwright tests.
- `pnpm check:file-size`: passed; checked source files are within the 1300-line
  limit.
- `pnpm build`: passed for shared, agents-sdk, core, and dash.

## Setup Progress List Follow-Up

- Replaced the overview setup-progress tiled stepper with a compact vertical
  list and kept each row clickable for direct configuration.
- Added setup-progress state derivation in `apps/dash/src/lib/overview.ts` so
  the panel hides once every setup step is complete, including a successful test
  call.
- Added dashboard unit coverage for the first incomplete next step and completed
  hidden state.
- Extended the dashboard E2E flow to return to overview after completing the
  account, instance, profile, key, and run path, then assert that `接入进度` is
  hidden and metrics remain visible.
- TDD red: `pnpm --filter @cli2api/dash test -- src/lib/overview.spec.ts`
  failed with 2 expected failures because `createSetupProgressState` was not
  implemented.
- TDD green: `pnpm --filter @cli2api/dash test -- src/lib/overview.spec.ts`
  passed with 5 files and 17 tests.
- `pnpm --filter @cli2api/dash build`: passed.
- Browser QA, incomplete setup at 390 px: `接入进度` count `1`, setup list
  buttons `5`, `clientWidth=390`, `scrollWidth=390`, `bodyScrollWidth=390`.
- Browser QA, completed setup at 1280 px: `接入进度` count `0`, metrics visible,
  `clientWidth=1280`, `scrollWidth=1280`, `bodyScrollWidth=1280`.
- `pnpm test`: passed with 12 files and 67 tests.
- `pnpm test:coverage`: passed with 83.41% statements, 69.01% branches,
  89.14% functions, and 84.03% lines.
- `pnpm test:e2e`: passed with 2 Playwright tests.
- `pnpm lint`: passed with zero warnings.
- `pnpm check:file-size`: passed; checked source files are within the 1300-line
  limit.
- `pnpm build`: passed for shared, agents-sdk, core, and dash.

## Dark Theme Integration

- Added PrimeVue Aura `darkModeSelector: ".dark"` and a persisted dashboard
  theme mode with `system`, `light`, and `dark`.
- Added unit coverage for supported theme modes, system resolution, root `.dark`
  class synchronization, local storage persistence, and dashboard state exposure.
- Replaced light-only dashboard shell/page colors with theme-aware dashboard CSS
  classes and kept PrimeVue as the main component surface.
- Replaced the shell language switcher with PrimeVue `Select` and added a
  PrimeVue `Select` theme switcher.
- `pnpm --filter @cli2api/dash test -- src/lib/dashboard-theme.spec.ts src/lib/dashboard-state.spec.ts`:
  passed with 5 files and 15 tests after the red/green cycle.
- `pnpm --filter @cli2api/dash build`: passed.
- `pnpm --filter @cli2api/dash test`: passed with 5 files and 15 tests.
- `pnpm build`: passed for shared, agents-sdk, core, and dash.
- `pnpm lint`: passed with zero warnings.
- `pnpm check:file-size`: passed; checked source files are within the 1300-line
  limit.
- `pnpm test:coverage`: passed with 12 files, 63 tests, 83.33% statements,
  68.73% branches, 89.06% functions, and 83.97% lines.
- `pnpm test`: passed with 12 files and 63 tests.
- `pnpm test:e2e`: passed with 2 Playwright tests, including dark/light theme
  toggle assertions through the PrimeVue selector.
- Browser/Playwright QA screenshots:
  - `/Users/x-lyda/work/cli2api/.tmp/dark-theme-qa/login-light.png`
  - `/Users/x-lyda/work/cli2api/.tmp/dark-theme-qa/login-dark.png`
  - `/Users/x-lyda/work/cli2api/.tmp/dark-theme-qa/overview-light.png`
  - `/Users/x-lyda/work/cli2api/.tmp/dark-theme-qa/overview-dark.png`
  - `/Users/x-lyda/work/cli2api/.tmp/dark-theme-qa/runs-dark.png`
  - `/Users/x-lyda/work/cli2api/.tmp/dark-theme-qa/sessions-dark.png`
- Desktop screenshot QA at 1366 px reported no horizontal overflow:
  `clientWidth=1366`, `scrollWidth=1366`, `bodyScrollWidth=1366`.
- Sessions page dark screenshot QA also reported no horizontal overflow:
  `clientWidth=1366`, `scrollWidth=1366`.

## Previous Evidence

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
