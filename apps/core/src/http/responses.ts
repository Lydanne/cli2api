import { Cli2ApiError, ErrorCode, createCli2ApiError } from "@cli2api/shared";

/** Returns a JSON response with a status code. */
export function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(body, { status, headers });
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

/** Creates a text/event-stream response from precomputed SSE payloads. */
export function sseResponse(chunks: unknown[]): Response {
  const body = `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("")}data: [DONE]\n\n`;
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache"
    }
  });
}
