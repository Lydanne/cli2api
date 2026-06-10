# Dashboard Product Design

## Product Shape

The dashboard is an operations console, not a demo page. Its primary workflow is
the managed serving path:

1. Downstream clients authenticate with API keys.
2. External model/profile ids define what clients can request.
3. Upstream provider accounts hold private Codex authentication state.
4. Runnable instances bind accounts to service-owned runtime workspaces,
   safe execution policy, and concurrency.
5. Route bindings connect public profiles to one or more upstream instances.
6. Runs prove the path and expose events, selected instance, errors, and usage.

This means navigation should follow the operating sequence while still keeping
high-frequency inspection surfaces close to the top: overview, runs, API keys,
profiles, route bindings, upstream accounts, instances, users.

## Information Architecture

- Overview: health and capacity across the whole serving path.
- Runs: request validation, selected route/instance, output, and stored events.
- API keys: downstream access, quotas, usage, and revocation.
- Profiles: public model ids and adapter/runtime defaults.
- Route bindings: profile-to-instance routing and coverage gaps.
- Upstream accounts: upstream account creation, browser/device auth, polling, and
  logout.
- Instances: execution slots, account binding, health, and concurrency.
- Users: dashboard administrators.

## Interaction Rules

- Chinese is the primary locale. English is a secondary operator preference,
  stored in local storage.
- Vue Router owns page navigation. Hash history is used so direct links and
  refreshes work behind Vite, core static serving, and Nginx without server
  rewrite coupling.
- The application shell owns login, session restore, refresh, locale switching,
  and error display. Pages only own their domain forms and tables.
- Route pages are real Vue Router components, not conditional blocks in one
  large component.
- The first login against an empty database creates the administrator account;
  later logins use the stored password hash.

## Dashboard State

The browser keeps a single dashboard state object with:

- Raw API resources: users, profiles, API keys, runs, usage buckets, accounts,
  instances, and route bindings.
- Derived product metrics: authenticated accounts, available instance slots,
  route coverage, active keys, failures, and monthly usage.
- Domain actions: create/revoke key, create profile, create account, start/poll
  auth, create/update/disable instance, create/delete route binding, create run,
  and load run events.

Shared state avoids each route re-fetching independently and keeps refresh
semantics predictable after route changes.

## UI System

PrimeVue carries form controls, tables, tags, cards, messages, and buttons.
Tailwind is used only for layout and spacing. The visual direction is dense,
quiet, and operational:

- No marketing hero or decorative background.
- Page headers are compact and action-oriented.
- Tables preserve stable columns for repeated inspection.
- Cards are only used for metrics or framed management surfaces.
- Raw ids remain visible where operators need them, but Chinese labels lead the
  interface.

## Theme System

Dark mode is part of the dashboard system, not a page-level override. PrimeVue
uses the Aura preset with `.dark` as the configured `darkModeSelector`.
Dashboard state owns a persisted theme mode with `light`, `dark`, and `system`
values. The resolved mode is synchronized to the document root so PrimeVue
tokens and custom dashboard CSS switch together.

Custom dashboard surfaces use semantic CSS classes backed by light and dark CSS
variables. Tailwind remains responsible for layout, spacing, and responsive
grid behavior, while color, border, and text tone choices come from the theme
layer. The shell, navigation, overview setup stepper, cards, management tables,
forms, event log, login panel, and muted metadata text must remain readable in
both modes.

## Development Slice

The first slice converts the current MVP dashboard into this structure without
changing backend contracts:

- Add this design document.
- Extract dashboard i18n and shared state.
- Replace `App.vue` tab conditionals with a dashboard shell and Vue Router page
  components.
- Keep existing E2E `data-testid` hooks while improving page hierarchy.
- Keep Compose deployment behavior and verify the dashboard build.

## Usability Follow-Up

Operator feedback showed that object-oriented labels still made the dashboard
hard to understand. The dashboard should lead with the serving chain instead:
upstream account, executor, client model, dispatch rule, client key, and test call.

The overview page now acts as the default setup surface. It shows whether the
HTTP entrypoint is callable, which setup steps are complete, and routes the
operator to the next incomplete step. The calls page also accepts a pasted
client key so test calls still work after a browser refresh.

## Data Cleanup

Dashboard-created setup data must be removable while operators are testing. The
delete rules are:

- Client keys can be deleted only before they have usage or run history; used
  keys must be revoked.
- Models can be deleted only before they have run history; their dispatch rules
  are removed with them.
- Executors can be deleted only when idle and before they have run history;
  otherwise they must be disabled.
- Upstream accounts can be deleted after their executors are removed; auth sessions
  are internal cleanup data and are removed with the account.
- Extra dashboard users can be deleted when they are not the current user, not
  the last active admin, and do not own client keys.
