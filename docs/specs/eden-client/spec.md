# Eden Client Spec

## Goal

Use Elysia Eden Treaty as the dashboard API SDK so `apps/dash` calls `apps/core`
through the Elysia application type instead of ad hoc path strings.

## Scope

- Export the core Elysia application type from `apps/core`.
- Add `@elysia/eden` to the dashboard runtime dependencies.
- Replace the dashboard's low-level JSON client with a typed Eden-backed
  dashboard API facade.
- Keep the current dashboard behavior, routes, authentication cookies, and E2E
  user flow unchanged.

## Non-Goals

- Do not generate checked-in SDK files.
- Do not change public API paths in this iteration.
- Do not require callers to pass arbitrary workspace paths.
- Do not fully schema all Elysia routes yet; this iteration creates the client
  foundation and keeps the next schema pass small.

## Acceptance

- `dash` imports the core `App` type and constructs an Eden Treaty client.
- Dashboard login, profile creation, API key creation, run creation, and run
  event viewing still pass E2E.
- Existing coverage gates remain above 60%.
- Commit messages remain Conventional Commit with Chinese descriptions.
