---
name: adapter-development
description: Use when adding or changing cli2api agent adapters such as Codex CLI, Claude Code, Gemini CLI, or mock adapters.
---

# Adapter Development

All adapters must implement the shared `AgentAdapter` contract and emit normalized `AgentEvent` records.

Rules:

- Do not leak provider-specific event shapes across package boundaries.
- Normalize failures into stable error codes from `@cli2api/shared`.
- Keep request-controlled fields separate from adapter profile configuration.
- Add tests with a fake adapter or mocked provider SDK before wiring real CLI behavior.
- Never run a real CLI command in unit tests.
