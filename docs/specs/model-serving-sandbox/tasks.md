# Model Serving Sandbox Tasks

- [x] Add runtime workspace base configuration.
- [x] Add `CLI2API_HOME` local home configuration.
- [x] Load `${CLI2API_HOME}/.env` before resolving derived paths.
- [x] Add a service helper that creates deterministic profile and instance
  runtime workspaces.
- [x] Add a tmp base directory derived from `CLI2API_HOME`.
- [x] Normalize profile creation to ignore payload `cwd`.
- [x] Normalize upstream instance create/update to ignore payload `cwd`, unsafe
  sandbox, and interactive approval policy.
- [x] Change profile and upstream instance runtime policy normalization from
  `workspace-write` to `read-only`.
- [x] Pass Codex SDK thread sandbox through `sandboxMode`, not the ignored
  `sandbox` option.
- [x] Add tests proving Codex execution receives `sandboxMode=read-only`,
  `approvalPolicy=never`, and a service-owned working directory.
- [x] Update OpenAI-compatible flow expectations from writable scratch execution
  to read-only text serving.
- [x] Remove profile `cwd` input/table column from Dash.
- [x] Remove upstream instance `cwd`, sandbox, and approval controls from Dash.
- [x] Remove upstream account `authHome` table column from Dash.
- [x] Update focused unit tests and E2E expectations.
- [x] Record verification in `evidence.md`.
