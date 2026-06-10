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

## Open Questions

- None blocking this integration slice.
