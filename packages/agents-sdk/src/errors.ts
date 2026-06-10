import { ErrorCode, toCli2ApiError, type Cli2ApiError } from "@cli2api/shared";

/** Normalizes unknown adapter failures to stable cli2api errors. */
export function normalizeAdapterError(error: unknown): Cli2ApiError {
  return toCli2ApiError(error, ErrorCode.RUN_FAILED);
}
