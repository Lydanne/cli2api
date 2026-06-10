# cli2api MVP Tasks

- [ ] Create repo standards, skills, and docs.
- [ ] Add pnpm workspace, TypeScript, Vitest, and Playwright configuration.
- [ ] Implement shared event, error, and DTO contracts.
- [ ] Implement adapter SDK with mock and Codex adapters.
- [ ] Implement core SQLite schema, migration, auth, quotas, run service, routes, and CLI.
- [ ] Implement dashboard views and API client.
- [ ] Add unit tests and E2E tests.
- [ ] Run build, unit tests, coverage, E2E, and file-size checks.

## Allowed Write Areas

- `.agents/**`
- `docs/**`
- `packages/**`
- `apps/**`
- Root workspace and test configuration files

## Required Commands

```bash
pnpm build
pnpm test
pnpm test:coverage
pnpm test:e2e
pnpm check:file-size
```
