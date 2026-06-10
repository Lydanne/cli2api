# Eden Client Evidence

## Required Verification

- `pnpm build`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm test:e2e`
- `pnpm lint`
- `pnpm check:file-size`

## Evidence Log

- `pnpm vitest run apps/dash/src/lib/api.spec.ts`: failed first because
  `createDashboardApi` did not exist.
- `pnpm vitest run apps/dash/src/lib/api.spec.ts`: passed after adding the
  Eden-backed dashboard API facade.
- `pnpm build && pnpm test:e2e`: build passed; dashboard E2E failed because
  empty Eden base URL generated `https://api/admin/...` requests in the browser.
- `pnpm exec playwright test tests/e2e/core-flow.spec.ts -g "dashboard covers"`:
  passed after defaulting the Eden client base URL to `window.location.origin`.
- `pnpm build && pnpm test && pnpm test:coverage && pnpm test:e2e && pnpm lint && pnpm check:file-size`:
  passed with 5 unit test files, 17 unit tests, 2 E2E tests, statements 73.97%,
  branches 61.37%, functions 75.42%, and lines 74.37%.
