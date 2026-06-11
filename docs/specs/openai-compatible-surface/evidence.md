# OpenAI Compatible Surface Evidence

## Source References

- Official path inventory source:
  `https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml`.
- Official API reference pages reviewed:
  - `https://developers.openai.com/api/reference/resources/models/methods/list`
  - `https://developers.openai.com/api/reference/resources/models/methods/retrieve`
  - `https://developers.openai.com/api/reference/resources/responses/methods/create`
  - `https://developers.openai.com/api/reference/resources/responses/methods/retrieve`
  - `https://developers.openai.com/api/reference/resources/chat`
  - `https://developers.openai.com/api/reference/overview`

## Red/Green Tests

- Red before implementation:
  `pnpm vitest run apps/core/src/core.spec.ts`
  - Result: failed as expected.
  - Missing `/v1/models/:model` returned 404 instead of 200.
  - `/v1/models` auth failure returned native cli2api error shape instead of
    OpenAI-compatible `error.type`, `error.code`, and `error.param`.
- Green after implementation:
  `pnpm vitest run apps/core/src/core.spec.ts`
  - Result: 1 test file passed, 13 tests passed.

## Verification

- `pnpm lint`
  - Result: passed with zero warnings.
- `pnpm test`
  - Result: 13 test files passed, 71 tests passed.
- `pnpm build`
  - Result: all workspace packages built successfully.
- `pnpm check:file-size`
  - Result: all checked source files are <= 1300 lines.
- `pnpm test:coverage`
  - Result: 13 test files passed, 71 tests passed.
  - Coverage summary: statements 82.61%, branches 65.8%, functions 88.83%,
    lines 83.26%.
- `pnpm test:e2e`
  - Result: 2 Playwright tests passed.
