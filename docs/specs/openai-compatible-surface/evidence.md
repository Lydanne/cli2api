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

- Red before Cherry Studio compatibility implementation:
  `pnpm vitest run apps/core/src/core.spec.ts`
  - Result: failed as expected.
  - `OPTIONS /v1/models` returned 404 instead of 204.
- Red before implementation:
  `pnpm vitest run apps/core/src/core.spec.ts`
  - Result: failed as expected.
  - Missing `/v1/models/:model` returned 404 instead of 200.
  - `/v1/models` auth failure returned native cli2api error shape instead of
    OpenAI-compatible `error.type`, `error.code`, and `error.param`.
- Green after implementation:
  `pnpm vitest run apps/core/src/core.spec.ts`
  - Result: 1 test file passed, 14 tests passed.

## Verification

- `pnpm lint`
  - Result: passed with zero warnings.
- `pnpm test`
  - Result: 13 test files passed, 72 tests passed.
- `pnpm build`
  - Result: all workspace packages built successfully.
- `pnpm check:file-size`
  - Result: all checked source files are <= 1300 lines.
- `pnpm test:coverage`
  - Result: 13 test files passed, 72 tests passed.
  - Coverage summary: statements 82.7%, branches 65.85%, functions 88.96%,
    lines 83.35%.
- `pnpm test:e2e`
  - Result: 2 Playwright tests passed.

## Cherry Studio Compatibility

- `curl -i -X OPTIONS http://127.0.0.1:5173/v1/models -H 'Origin:
  app://cherry-studio' -H 'Access-Control-Request-Method: GET' -H
  'Access-Control-Request-Headers: authorization,content-type'`
  - Before implementation on the running service: returned 404 without CORS
    headers.
- Test coverage now proves `/v1/models` preflight returns 204, model discovery
  responses expose CORS headers and OpenAI model metadata, and
  `/v1/chat/completions` detection responses expose CORS headers plus a
  `created` field.
