# Eden Client Design

## Architecture

Elysia Eden Treaty provides end-to-end type safety by importing the server's
`App` type on the client. The dashboard will use a small facade over Eden Treaty
instead of calling `fetch` directly from UI code.

The facade lives in `apps/dash/src/lib/api.ts` and exposes domain methods:

- `login`
- `users`
- `profiles`
- `createProfile`
- `apiKeys`
- `createApiKey`
- `runs`

This keeps Vue components simple and avoids leaking Treaty path syntax into the
view layer.

## Data Flow

1. `apps/core/src/app.ts` exports `type App = ReturnType<typeof createApp>`.
2. `apps/dash/src/lib/api.ts` imports `treaty` and `type App`.
3. `createDashboardApi(baseUrl)` creates `treaty<App>(baseUrl)`.
4. UI calls domain methods on the facade.
5. The facade translates Eden `{ data, error }` results into plain values or
   `ApiError`.

## Error Handling

Eden returns an object with either `data` or `error`. The facade normalizes
errors into the existing `ApiError` shape so dashboard error handling does not
need to change.

## Testing

Tests should prove the facade calls the expected Treaty path and normalizes
errors. E2E remains the user-facing proof that the dashboard can log in, create
profiles and keys, trigger a run, and read run events.
