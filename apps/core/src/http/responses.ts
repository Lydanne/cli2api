import { Cli2ApiError, ErrorCode, createCli2ApiError } from "@cli2api/shared";

/** Returns a JSON response with a status code. */
export function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(body, { status, headers });
}

/** Returns CORS headers for OpenAI-compatible `/v1` clients. */
export function openAiCorsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
    "access-control-allow-headers":
      "authorization, content-type, api-key, x-api-key, openai-organization, openai-project",
    "access-control-expose-headers": "content-type",
    "access-control-max-age": "86400"
  };
}

/** Returns a JSON response with OpenAI-compatible CORS headers. */
export function openAiJsonResponse(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return jsonResponse(body, status, { ...openAiCorsHeaders(), ...headers });
}

/** Returns a successful OpenAI-compatible CORS preflight response. */
export function openAiOptionsResponse(): Response {
  return new Response(null, { status: 204, headers: openAiCorsHeaders() });
}

/** Serializes thrown values into stable API error responses. */
export function errorResponse(error: unknown): Response {
  const normalized =
    error instanceof Cli2ApiError
      ? error
      : createCli2ApiError(ErrorCode.RUN_FAILED, error instanceof Error ? error.message : "Unknown error");

  return jsonResponse(
    {
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details
      }
    },
    normalized.status
  );
}

/** Serializes thrown values into OpenAI-compatible error responses. */
export function openAiErrorResponse(error: unknown, param: string | null = null): Response {
  const normalized =
    error instanceof Cli2ApiError
      ? error
      : createCli2ApiError(ErrorCode.INVALID_REQUEST, error instanceof Error ? error.message : "Invalid request", 400);

  return openAiJsonResponse(
    {
      error: {
        message: normalized.message,
        type: openAiErrorType(normalized),
        param,
        code: String(normalized.code).toLowerCase()
      }
    },
    normalized.status
  );
}

/** Creates an OpenAI-compatible 501 response for a recognized but unsupported `/v1` endpoint. */
export function openAiUnsupportedResponse(endpoint: string): Response {
  return openAiJsonResponse(
    {
      error: {
        message: `OpenAI-compatible endpoint is not implemented: ${endpoint}`,
        type: "invalid_request_error",
        param: null,
        code: "unsupported_endpoint"
      }
    },
    501
  );
}

/** Creates a text/event-stream response with OpenAI-compatible CORS headers. */
export function openAiSseResponse(chunks: unknown[]): Response {
  return sseResponse(chunks, openAiCorsHeaders());
}

/** Creates a text/event-stream response from precomputed SSE payloads. */
export function sseResponse(chunks: unknown[], headers?: HeadersInit): Response {
  const body = `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("")}data: [DONE]\n\n`;
  return new Response(body, {
    status: 200,
    headers: {
      ...headers,
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache"
    }
  });
}

function openAiErrorType(error: Cli2ApiError): string {
  if (error.code === ErrorCode.RATE_LIMITED || error.code === ErrorCode.QUOTA_EXCEEDED) {
    return "rate_limit_error";
  }
  if (error.status >= 500) {
    return "server_error";
  }
  return "invalid_request_error";
}
