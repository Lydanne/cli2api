# Dashboard Product Design Tasks

- [x] Document the dashboard product model and page ownership.
- [x] Extract dashboard i18n into a reusable module.
- [x] Extract dashboard data/actions into a shared state provider.
- [x] Replace conditional tab rendering with Vue Router page components.
- [x] Rework the dashboard shell into a Chinese-first operations console.
- [x] Preserve existing dashboard E2E selectors during the UI restructuring.
- [x] Verify build, unit tests, E2E, lint, coverage, file-size checks, and
  deployment helper after the slice.
- [x] Configure PrimeVue Aura with a shared `.dark` selector.
- [x] Add persisted dashboard theme state for `light`, `dark`, and `system`.
- [x] Replace light-only dashboard color classes with theme-aware classes.
- [x] Use PrimeVue option controls for locale and theme selection in the shell.
- [x] Verify light and dark screenshots for login, overview, and runs surfaces.
- [x] Convert overview setup progress from tiled stepper to compact list.
- [x] Hide overview setup progress when all setup steps are complete.
- [x] Add focused dashboard unit coverage for setup progress visibility.
- [x] Add client-key page copy action for the same-origin `/v1` base URL.
- [x] Cover client base URL derivation with dashboard unit tests.
- [x] Add dashboard-state coverage for delete-on-used-key falling back to
  revocation.
- [x] Implement the client-key delete fallback without changing backend delete
  constraints.
- [x] Add E2E assertions that inline create inputs are hidden until a modal is
  opened and modal submit buttons still complete creation.
- [x] Add a reusable dashboard creation dialog wrapper.
- [x] Move client-key, model, account, executor, route, user, and run creation
  forms into modal dialogs.
- [x] Add core coverage for safe delete still rejecting used keys and force
  delete removing dependent key history.
- [x] Add dashboard state and E2E coverage for hard-deleting a used key.
- [x] Implement `force=true` API-key deletion and dashboard hard-delete action.
- [x] Add E2E coverage that creation dialogs show explanatory text and field
  hints.
- [x] Add E2E coverage that destructive buttons require confirmation before
  deletion, reset, revoke, or disable takes effect.
- [x] Add reusable dashboard components for explained form fields and confirmed
  destructive actions.
- [x] Apply the explained form and confirmation pattern across client keys,
  models, accounts, executors, dispatch rules, users, sessions, and test calls.
