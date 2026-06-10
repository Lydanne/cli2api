# Upstream Session Affinity Design

## Request Identity

Core normalizes every run into a session scope:

- `apiKeyId`: always taken from the authenticated downstream API key.
- `profileId`: the public model/profile selected by the request.
- `userId`: top-level `user` first, then `metadata.user`, then `default`.
- `sessionId`: top-level `sessionId`, top-level `conversationId`,
  `metadata.sessionId`, `metadata.conversationId`, then `default`.

Sessions are never manually created. A session record is created on the first
run that uses a new normalized scope.

## Persistence

Core adds `upstream_run_sessions`:

- `id`: stable internal row id.
- `api_key_id`, `profile_id`, `user_id`, `session_id`: unique session scope.
- `upstream_instance_id`: preferred instance for this session.
- `run_count`: number of runs that updated this affinity.
- `created_at`, `updated_at`, `last_used_at`: management timestamps.

The table has a unique index on
`api_key_id, profile_id, user_id, session_id`.

## Scheduling

The scheduler builds healthy candidates from enabled instances matching the
profile type, authenticated accounts, healthy or unknown health state, and
available capacity. Legacy explicit route bindings still narrow the candidate
set if they exist, preserving existing API behavior.

When a session has a pinned instance:

- If the pinned instance is healthy and has capacity, select it.
- If the pinned instance is healthy but temporarily at capacity, use the normal
  candidate picker for this run without moving the persistent pin.
- If the pinned instance is disabled, unhealthy, unauthenticated, wrong type, or
  missing, select a new candidate and update the session pin.

When a session has no pin, the scheduler uses rendezvous hashing over the
session scope and candidate instance ids. This spreads new sessions across
instances while keeping initial assignment deterministic.

## APIs

- `GET /api/admin/upstream/run-sessions`: returns session affinity records.
- `DELETE /api/admin/upstream/run-sessions/:id`: deletes one affinity record.
  The next request for the same scope recreates it automatically.

No create endpoint is provided.

## Dashboard

The route-binding nav entry is replaced by a session-management entry. Direct
navigation to `#/route-bindings` redirects to `#/sessions` for compatibility.

The Sessions page is read-mostly:

- user id
- session id
- model/profile
- preferred instance
- run count
- last-used time
- reset action

## Error Handling

If a session exists but no healthy candidate is available, the scheduler returns
the existing `UPSTREAM_UNAVAILABLE` error. Resetting an unknown session returns a
stable not-found error through the existing admin error response path.

## Rollback Notes

The legacy route-binding table and APIs remain in place. Rolling back the
dashboard can expose route bindings again without deleting session affinity data.
