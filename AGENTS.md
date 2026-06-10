# AGENTS.md

## Repository Contract

- Use `pnpm` for all package management and scripts.
- Read `.agents/skills/project-standards/SKILL.md` before planning or implementing changes in this repository.
- Write or update the relevant spec packet under `docs/specs/<feature>/` before changing production code.
- Keep source files under 1300 lines. Split files before they approach 1000 lines.
- Add TSDoc comments to every exported interface, type, function, class, and constant that is part of a public module contract.
- Prefer E2E-backed acceptance for product flows. Keep total coverage gates at or above 60%.
- Use Conventional Commits for every logical slice. Prefer `pnpm commit` for interactive Commitizen prompts.
- Write commit subjects and bodies in Chinese while keeping the Conventional Commit `type(scope):` prefix.
- Commit hooks must pass: `commit-msg` runs commitlint, and `pre-commit` runs lint plus source file-size checks.
- Run `pnpm test`, `pnpm test:coverage`, and `pnpm test:e2e` before claiming the MVP is ready.

## Project Layout

- `packages/agents-sdk`: adapter contracts and CLI integrations.
- `packages/shared`: shared API types, events, and errors.
- `apps/core`: Elysia server, SQLite/Drizzle persistence, quotas, API routes, and CLI.
- `apps/dash`: Vite/Vue/PrimeVue/Tailwind management dashboard.
- `docs/`: user docs, specifications, and developer docs.

## Implementation Notes

- API keys must be stored as a prefix plus hash, never as plaintext.
- Adapter profiles own their allowed working directory and execution policy. Requests must not override `cwd`.
- OpenAI-compatible endpoints are a minimal compatibility layer over the native run model.
