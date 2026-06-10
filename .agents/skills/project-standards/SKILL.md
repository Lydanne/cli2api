---
name: project-standards
description: Use before planning, implementing, reviewing, or verifying cli2api repository changes. Enforces repo-specific Spec Coding, file-size, documentation, testing, and evidence rules.
---

# cli2api Project Standards

## Required Workflow

1. Read the active spec packet in `docs/specs/<feature>/` before code changes.
2. If behavior changes and no spec exists, create or update `spec.md`, `design.md`, `tasks.md`, and `evidence.md` first.
3. Write tests for core behavior before production code when the change is executable behavior.
4. Implement the smallest scoped change that satisfies the spec.
5. Update `evidence.md` with commands, outputs, screenshots, or logs used to prove the work.

## Hard Rules

- No source file may exceed 1300 lines. Split before 1000 lines.
- Exported interfaces, types, classes, functions, and constants require TSDoc comments.
- Complex private functions need a short orienting comment.
- Public API errors must use stable machine-readable codes.
- API keys and upstream secrets must not be stored in plaintext.
- Adapter profiles define `cwd`, sandbox, approval policy, and environment. Request payloads cannot expand filesystem access.
- Commit each completed logical slice with a Conventional Commit message. Use `pnpm commit` when creating commits interactively.
- Commit descriptions and bodies must be written in Chinese. Keep the Conventional Commit type/scope prefix, for example `feat(core): 增加运行队列`.
- Do not bypass commitlint or pre-commit lint/file-size hooks unless the final response records the exact reason.

## Verification

- Run `pnpm test`.
- Run `pnpm test:coverage`; lines, functions, statements, and branches must be at least 60%.
- Run `pnpm test:e2e` for flows touching the API, dashboard, auth, quotas, or adapters.
- Run `pnpm lint` before commits that change source, tests, or configuration.
- If a check cannot run, record the exact reason in the final response and in the relevant evidence file when applicable.
