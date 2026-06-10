/** Stable machine-readable errors returned by cli2api APIs and adapters. */
export enum ErrorCode {
  INVALID_REQUEST = "INVALID_REQUEST",
  AUTH_FAILED = "AUTH_FAILED",
  PROFILE_NOT_FOUND = "PROFILE_NOT_FOUND",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  RATE_LIMITED = "RATE_LIMITED",
  ADAPTER_UNAVAILABLE = "ADAPTER_UNAVAILABLE",
  RUN_FAILED = "RUN_FAILED",
  TIMEOUT = "TIMEOUT"
}

/** JSON-compatible metadata attached to API errors. */
export type ErrorDetails = Record<string, unknown>;

/** Error object used across HTTP routes and adapter boundaries. */
export class Cli2ApiError extends Error {
  /** Stable machine-readable error code. */
  public readonly code: ErrorCode;

  /** HTTP status that should be used when serialized by the API layer. */
  public readonly status: number;

  /** Optional structured error details for operators and clients. */
  public readonly details?: ErrorDetails;

  /** Creates a stable cli2api error. */
  public constructor(code: ErrorCode, message: string, status = 500, details?: ErrorDetails) {
    super(message);
    this.name = "Cli2ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** Creates a stable cli2api error with a code, status, and optional details. */
export function createCli2ApiError(
  code: ErrorCode,
  message: string,
  status = 500,
  details?: ErrorDetails
): Cli2ApiError {
  return new Cli2ApiError(code, message, status, details);
}

/** Converts an unknown thrown value into a cli2api error. */
export function toCli2ApiError(error: unknown, fallbackCode = ErrorCode.RUN_FAILED): Cli2ApiError {
  if (error instanceof Cli2ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new Cli2ApiError(fallbackCode, error.message);
  }

  return new Cli2ApiError(fallbackCode, "Unknown error");
}
