---
name: release-verification
description: Use before claiming cli2api changes are ready, before release notes, or before PR handoff.
---

# Release Verification

Before declaring work ready:

1. Run `pnpm test`.
2. Run `pnpm test:coverage`.
3. Run `pnpm test:e2e`.
4. Check file sizes with `pnpm check:file-size`.
5. Confirm docs under `docs/` match the implemented commands and API routes.

Report exact command results. Do not infer success from partial checks.
