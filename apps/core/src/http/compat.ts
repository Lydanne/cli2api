import type { RunResponse } from "@cli2api/shared";

/** Converts a Responses API input payload into a prompt string. */
export function responsesPrompt(input: unknown): string {
  if (typeof input === "string") {
    return input;
  }
  if (Array.isArray(input)) {
    return input
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object" && "content" in item) {
          return String((item as { content: unknown }).content);
        }
        return JSON.stringify(item);
      })
      .join("\n");
  }
  return JSON.stringify(input ?? "");
}

/** Converts Chat Completions messages into a prompt string. */
export function chatPrompt(messages: unknown): string {
  if (!Array.isArray(messages)) {
    return "";
  }
  return messages
    .map((message) => {
      const record = message as { role?: string; content?: unknown };
      return `${record.role ?? "user"}: ${String(record.content ?? "")}`;
    })
    .join("\n");
}

/** Converts an internal run into a minimal OpenAI Responses payload. */
export function toResponsesPayload(run: RunResponse): Record<string, unknown> {
  return {
    id: run.id,
    object: "response",
    status: run.status,
    model: run.profileId,
    output_text: run.output ?? "",
    usage: toOpenAiUsage(run)
  };
}

/** Converts an internal run into a minimal Chat Completions payload. */
export function toChatPayload(run: RunResponse): Record<string, unknown> {
  return {
    id: run.id,
    object: "chat.completion",
    model: run.profileId,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: run.output ?? "" },
        finish_reason: run.status === "completed" ? "stop" : "error"
      }
    ],
    usage: toOpenAiUsage(run)
  };
}

function toOpenAiUsage(run: RunResponse): Record<string, number> {
  return {
    prompt_tokens: run.usage.inputTokens,
    completion_tokens: run.usage.outputTokens,
    total_tokens: run.usage.totalTokens
  };
}
