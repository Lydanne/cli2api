import type { AdapterProfile, OpenAiModel, RunResponse } from "@cli2api/shared";

/** Converts an adapter profile into an OpenAI-compatible model record. */
export function toModelPayload(profile: AdapterProfile): OpenAiModel {
  return { object: "model", id: profile.id, owned_by: "cli2api" };
}

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
        if (isRecord(item) && "content" in item) {
          const role = typeof item.role === "string" ? item.role : "user";
          return `${role}: ${contentToText(item.content)}`;
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
      const record = isRecord(message) ? message : {};
      const role = typeof record.role === "string" ? record.role : "user";
      return `${role}: ${contentToText(record.content)}`;
    })
    .join("\n");
}

/** Converts a legacy Completions prompt payload into a prompt string. */
export function completionPrompt(prompt: unknown): string {
  if (typeof prompt === "string") {
    return prompt;
  }
  if (Array.isArray(prompt)) {
    return prompt.map((item) => String(item)).join("\n");
  }
  return JSON.stringify(prompt ?? "");
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

/** Converts an internal run into a Responses input items list payload. */
export function toResponseInputItemsPayload(run: RunResponse): Record<string, unknown> {
  const itemId = `${run.id}-input`;
  return {
    object: "list",
    data: [
      {
        id: itemId,
        object: "item",
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: run.prompt }]
      }
    ],
    first_id: itemId,
    last_id: itemId,
    has_more: false
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

/** Converts an internal run into a Chat Completions messages list payload. */
export function toChatMessagesPayload(run: RunResponse): Record<string, unknown> {
  const messageId = `${run.id}-user`;
  return {
    object: "list",
    data: [
      {
        id: messageId,
        object: "chat.completion.message",
        role: "user",
        content: run.prompt
      }
    ],
    first_id: messageId,
    last_id: messageId,
    has_more: false
  };
}

/** Converts an internal run into a legacy Completions payload. */
export function toCompletionPayload(run: RunResponse): Record<string, unknown> {
  return {
    id: run.id,
    object: "text_completion",
    model: run.profileId,
    choices: [
      {
        text: run.output ?? "",
        index: 0,
        logprobs: null,
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

function contentToText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((part) => contentPartToText(part)).filter(Boolean).join("\n");
  }
  if (isRecord(content) && "text" in content) {
    return String(content.text ?? "");
  }
  return content === undefined || content === null ? "" : JSON.stringify(content);
}

function contentPartToText(part: unknown): string {
  if (typeof part === "string") {
    return part;
  }
  if (isRecord(part)) {
    if ("text" in part) {
      return String(part.text ?? "");
    }
    if ("content" in part) {
      return contentToText(part.content);
    }
  }
  return JSON.stringify(part);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
