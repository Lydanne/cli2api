# Dashboard Product Design Spec

## Context

- The dashboard is a dense operations console built with Vue, PrimeVue, and
  Tailwind layout utilities.
- PrimeVue is already used for cards, tables, forms, messages, tags, buttons,
  and toolbars.
- Dark mode is currently inconsistent because PrimeVue is configured with only
  the Aura preset, while the dashboard shell and page templates hard-code light
  Tailwind colors such as `bg-white`, `bg-slate-100`, `border-slate-200`, and
  `text-slate-500`.
- Operators need dark mode to feel like the same product, not a partial color
  override.

## Goal

- Integrate dashboard dark mode through the PrimeVue theme system and a shared
  dashboard theme state.
- Keep the visual style operational, compact, Chinese-first, and suitable for
  repeated inspection.
- Preserve existing dashboard product flows and route selectors while improving
  dark-mode readability.

## Scope

- In scope:
  - PrimeVue Aura theme configuration with an explicit `.dark` selector.
  - Dashboard theme state with `light`, `dark`, and `system` modes.
  - Local storage persistence for the selected theme mode.
  - Root document class synchronization so PrimeVue and custom dashboard CSS use
    the same dark-mode source.
  - A PrimeVue-based theme selector in the dashboard shell.
  - Theme-aware styling for shell, navigation, login, overview, tables, forms,
    event logs, progress panels, and supporting text.
  - Unit coverage for theme mode resolution and root class synchronization.
  - Visual verification of light and dark dashboard surfaces.
  - Overview setup progress rendered as a compact list while any setup step is
    incomplete.
  - Automatic hiding of the overview setup progress once every setup step has
    completed, including a successful test call.
  - A copyable client base URL on the client-key page so operators can paste the
    serving endpoint into downstream tools.
  - Delete-on-used-client-key handling that falls back to revocation and
    refreshes the table instead of surfacing the backend audit-history error.
  - Creation flows opened from compact page actions and completed in modal
    forms for client keys, models, upstream accounts, executors, dispatch rules,
    dashboard users, and test calls.
  - Creation dialogs include operator-facing purpose text and field-level help
    so the form explains what will be created and how each value is used.
  - Client-key hard deletion that can remove a key together with its run,
    event, usage, and session-affinity records when explicitly requested.
  - Delete and destructive lifecycle actions require an explicit confirmation
    dialog before the dashboard calls the backing API action.
- Out of scope:
  - Backend API changes.
  - New dashboard pages or navigation items.
  - Replacing PrimeVue with another component library.
  - Marketing-style redesign, decorative art, or large layout restructuring.

## Acceptance Criteria

- [x] PrimeVue is configured with `darkModeSelector: ".dark"`.
- [x] Dashboard state exposes a theme mode that supports `light`, `dark`, and
  `system`.
- [x] The selected theme mode is persisted in local storage.
- [x] The document root receives `.dark` only when the resolved mode is dark.
- [x] The dashboard shell uses PrimeVue controls for both locale and theme
  option selection.
- [x] Hard-coded light-only dashboard surfaces are replaced with theme-aware
  classes or dark-mode pairs.
- [x] Login, overview, runs, and management-table pages remain readable in both
  light and dark modes.
- [x] Existing E2E product flow continues to pass after selector updates.
- [x] Evidence records build/test/lint/coverage/E2E results and dark-mode
  screenshots or screenshot paths.
- [x] Overview setup progress is rendered as a vertical list instead of a
  tiled stepper.
- [x] Overview setup progress is hidden once all setup steps have completed.
- [x] Client-key page displays the current same-origin `/v1` base URL.
- [x] Client-key page can copy that base URL without exposing stored API key
  plaintext.
- [x] Client-key delete action handles used keys by revoking them and keeping
  the dashboard error area clear.
- [x] Creation forms are no longer laid out inline above resource tables.
- [x] Modal creation forms keep their existing fields and action test selectors,
  close after successful submit, and stay open when submit fails.
- [x] Client-key actions expose both normal delete and explicit hard delete.
- [x] Hard-deleting a used client key removes its dependent dashboard history so
  the key disappears from the key table, usage totals, run table, and session
  list.
- [x] Creation dialogs explain the resource purpose and show field-level hints
  for client keys, models, accounts, executors, dispatch rules, users, and test
  calls.
- [x] Delete, hard-delete, reset-session, revoke, and disable actions open a
  confirmation dialog and only run after the operator confirms.

## Open Questions

- None blocking this integration slice.
