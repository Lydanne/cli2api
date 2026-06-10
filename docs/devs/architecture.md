# Developer Architecture

## Packages

- `@cli2api/shared`: exported API contracts, error codes, and event types.
- `@cli2api/agents-sdk`: adapter abstractions and concrete CLI integrations.
- `@cli2api/core`: HTTP API, SQLite persistence, quotas, and CLI commands.
- `@cli2api/dash`: operator dashboard.

## Runtime Flow

1. A downstream request authenticates with a hashed API key.
2. Core resolves the requested adapter profile.
3. Quota checks run before execution.
4. The adapter emits normalized events.
5. Core stores events, final output, status, duration, and usage.
6. Native and compatibility APIs return the same run state in different wire formats.

## Adapter Extension

New adapters should implement `AgentAdapter`, normalize all provider events into `AgentEvent`, and keep provider-specific configuration inside adapter profile metadata.
