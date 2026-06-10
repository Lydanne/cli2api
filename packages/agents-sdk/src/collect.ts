import type { AgentEvent } from "@cli2api/shared";

/** Collects an async event stream into an array for tests and synchronous API flows. */
export async function collectAgentEvents(events: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const collected: AgentEvent[] = [];
  for await (const event of events) {
    collected.push(event);
  }
  return collected;
}
