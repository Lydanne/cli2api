import { ErrorCode, createCli2ApiError } from "@cli2api/shared";
import type { ApiKeyRow } from "../services/api-keys.js";
import type { Services } from "../services/index.js";
import { readSessionCookie } from "../services/sessions.js";
import type { UserRow } from "../services/users.js";

/** Requires an admin session from request cookies. */
export function requireAdmin(services: Services, request: Request): UserRow {
  return services.sessions.requireUser(readSessionCookie(request.headers.get("cookie")));
}

/** Requires a downstream API key from the Authorization header. */
export function requireApiKey(services: Services, request: Request): ApiKeyRow {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw createCli2ApiError(ErrorCode.AUTH_FAILED, "Missing bearer token", 401);
  }
  return services.apiKeys.authenticate(header.slice("Bearer ".length));
}
