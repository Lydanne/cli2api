---
name: spec-coding
description: Use when creating or updating cli2api feature specifications before implementation. Produces concise spec.md, design.md, tasks.md, and evidence.md files under docs/specs.
---

# Spec Coding For cli2api

Create a small reviewable spec packet before code changes:

- `spec.md`: context, goal, scope, non-goals, acceptance criteria, and open questions.
- `design.md`: architecture choices, API/data contracts, rejected options, and rollback notes.
- `tasks.md`: implementation slices, allowed write areas, and test commands.
- `evidence.md`: required and completed verification evidence.

Keep specs concrete enough that an implementer can map every changed file and test back to an acceptance criterion. If implementation discovers new behavior, update the spec before continuing.
