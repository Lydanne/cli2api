# Upstream Account Pool Spec

## Context

- cli2api currently maps downstream requests directly to an adapter profile.
- Operators need to run multiple Codex upstream accounts or instances behind one
  downstream API surface.
- The dashboard is still MVP-grade and must become an operations console with
  Chinese as the primary UI language plus optional English.
- The installed PrimeVue library should carry the main dashboard controls rather
  than leaving the UI as bespoke forms and HTML tables.
- Dashboard navigation must use Vue Router and survive browser refresh and
  direct links.
- Codex authentication should be initiated from the dashboard, while actual auth
  execution stays in trusted backend or SDK code.

## Goal

- Add an upstream account pool model for Codex accounts and runnable instances.
- Let operators authenticate Codex accounts from the dashboard through a
  backend-managed Codex auth session.
- Let run routing select a healthy upstream instance instead of binding every run
  directly to one adapter profile.
- Establish an `agents-sdk` authentication contract so future adapters can reuse
  the same auth lifecycle.
- Make dashboard copy Chinese-first while supporting an English locale switch.

## Scope

- In scope:
  - `agents-sdk` auth provider interfaces and Codex auth provider implementation.
  - Backend data model and admin APIs for upstream accounts, auth sessions,
    instances, and profile-to-instance routing.
  - Scheduler selection from healthy enabled instances with per-instance
    concurrency limits.
  - Dashboard account pool, instance pool, routing, run monitoring, API key, and
    user-management improvements.
  - Chinese-first dashboard i18n with `zh-CN` default and `en-US` fallback.
  - PrimeVue-based dashboard control surface, Vue Router hash-history page
    navigation, and existing-session restore on page load.
- Allowed write paths:
  - `packages/agents-sdk/**`, `packages/shared/**`, `apps/core/**`,
    `apps/dash/**`, `docs/**`, root workspace config, and tests.
- Read-only context:
  - Existing git history and committed deployment behavior.

## Non-goals

- No distributed scheduler or multi-node locking in this slice.
- No billing, recharge, or commercial account marketplace.
- No plaintext persistence of upstream secrets or downstream API keys.
- No browser-side direct execution of Codex CLI or SDK.
- No browser-history deployment rewrite; Vue Router uses hash history so Compose
  Nginx and core static serving keep working with direct links.

## Acceptance Criteria

- [x] `agents-sdk` exposes provider-neutral auth interfaces.
- [x] `agents-sdk` includes a Codex auth provider that can start device auth,
  check auth status, login with stdin-provided secrets, and logout using an
  isolated `CODEX_HOME`.
- [x] Unit tests cover Codex auth command construction without launching real
  Codex authentication.
- [x] Core can persist upstream accounts, auth sessions, and upstream instances.
- [x] Core admin APIs can start/poll/cancel Codex auth sessions.
- [x] Runs record the selected upstream instance id.
- [x] Scheduler only selects enabled, healthy instances below concurrency limit.
- [x] Dashboard supports Chinese as the default language and English as an
  alternate locale.
- [x] Dashboard lets operators create Codex accounts, start browser/device auth,
  poll status, create instances, and inspect health/concurrency.
- [x] Core admin APIs support account logout, instance update/disable, and
  explicit profile-to-instance route bindings.
- [x] Scheduler honors explicit route bindings before falling back to type-based
  instance selection.
- [x] Dashboard exposes route binding, upstream logout/disable, API key quota,
  and admin-user creation controls.
- [x] Dashboard uses the installed PrimeVue component library for the main
  control surface instead of plain hand-rolled tables/forms.
- [x] Dashboard navigation is backed by Vue Router and writes the current page
  into the URL so refresh and direct links keep the selected management page.
- [x] Dashboard restores an existing admin session on page load so refresh does
  not discard visible backend state.
- [x] `pnpm test`, `pnpm test:coverage`, `pnpm test:e2e`, `pnpm lint`, and
  `pnpm check:file-size` pass before release handoff.

## Open Questions

- Whether the first production auth method should be only Codex device auth, or
  also expose API-key/access-token login from the first dashboard version.
