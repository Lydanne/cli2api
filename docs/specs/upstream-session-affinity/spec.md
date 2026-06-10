# Upstream Session Affinity Spec

## Context

- The dashboard currently exposes a route-binding page that manually pins one
  public model profile to one upstream instance.
- Operators want multiple instances to be selected automatically by the
  scheduler instead of configuring model-to-instance bindings by hand.
- Codex sessions benefit from reusing the same upstream instance because local
  provider/runtime caches stay warm.
- Downstream callers need user/session isolation: each user has independent
  sessions, and one user can have multiple sessions.

## Goal

- Automatically create and reuse upstream run sessions from request identity.
- Prefer the same upstream instance for the same API key, user, session, and
  profile while still falling back to another healthy instance when needed.
- Replace the dashboard route-binding workflow with session visibility and
  reset controls.

## Scope

- In scope:
  - Core request parsing for `user`, `sessionId`, and metadata-backed
    `sessionId` / `conversationId`.
  - SQLite persistence for automatically-created upstream run sessions.
  - Scheduler affinity by `apiKeyId + userId + sessionId + profileId`.
  - Admin APIs to list and delete session affinity records.
  - Dashboard session-management page and navigation updates.
  - E2E coverage for auto-created session affinity.
- Out of scope:
  - Manual session creation from the dashboard.
  - Cross-node distributed affinity locking.
  - Long-term transcript storage or chat history replay.
  - Removing legacy route-binding APIs from core in this slice.

## Acceptance Criteria

- [x] Native `/api/runs` can accept `user`, `sessionId`, and `conversationId`
  fields and creates/reuses a session affinity record automatically.
- [x] OpenAI-compatible `/v1/responses` and `/v1/chat/completions` use `user`
  plus `metadata.sessionId` or `metadata.conversationId` when supplied.
- [x] If no session id is supplied, the backend uses a stable default session
  per `apiKeyId + user + profile`.
- [x] Repeated requests for the same `apiKeyId + user + session + profile`
  prefer the same healthy upstream instance.
- [x] Different sessions for the same user create independent affinity records.
- [x] A session whose pinned instance is disabled, unhealthy, unauthenticated, or
  otherwise unavailable is automatically rebound to another available instance.
- [x] A temporarily saturated pinned instance may overflow to another healthy
  instance without requiring manual dashboard intervention.
- [x] Dashboard navigation exposes session management and no longer exposes the
  route-binding page as a primary workflow.
- [x] Session management lists user, session, profile, instance, run count, and
  last-used time, and can reset a session so the next request reassigns it.
- [x] Existing route-binding APIs continue to work for compatibility, but the
  default dashboard flow does not depend on them.
- [x] `pnpm build`, `pnpm test`, `pnpm test:coverage`, `pnpm test:e2e`,
  `pnpm lint`, and `pnpm check:file-size` pass before handoff.

## Open Questions

- Whether future versions should expose per-model scheduling policies such as
  weighted round-robin, sticky-only, or overflow-allowed. This slice uses
  sticky-with-overflow.
