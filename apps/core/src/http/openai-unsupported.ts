import type { AnyElysia } from "elysia";
import type { Services } from "../services/index.js";
import { requireApiKey } from "./auth.js";
import { openAiErrorResponse, openAiUnsupportedResponse } from "./responses.js";

type UnsupportedMethod = "all" | "delete" | "get" | "post";

interface UnsupportedOpenAiRoute {
  method: UnsupportedMethod;
  path: string;
}

const unsupportedOpenAiRoutes: UnsupportedOpenAiRoute[] = [
  { method: "delete", path: "/v1/models/:model" },
  { method: "delete", path: "/v1/responses/:response_id" },
  { method: "post", path: "/v1/responses/:response_id/cancel" },
  { method: "post", path: "/v1/responses/:response_id/compact" },
  { method: "post", path: "/v1/responses/count_tokens" },
  { method: "all", path: "/v1/responses/input_tokens" },
  { method: "all", path: "/v1/responses/compact" },
  { method: "post", path: "/v1/embeddings" },
  { method: "post", path: "/v1/moderations" },
  { method: "post", path: "/v1/images/generations" },
  { method: "post", path: "/v1/images/edits" },
  { method: "post", path: "/v1/images/variations" },
  { method: "post", path: "/v1/audio/speech" },
  { method: "post", path: "/v1/audio/transcriptions" },
  { method: "post", path: "/v1/audio/translations" },
  { method: "all", path: "/v1/audio/voice_consents" },
  { method: "all", path: "/v1/audio/voice_consents/:consent_id" },
  { method: "all", path: "/v1/audio/voices" },
  { method: "get", path: "/v1/files" },
  { method: "post", path: "/v1/files" },
  { method: "get", path: "/v1/files/:file_id" },
  { method: "delete", path: "/v1/files/:file_id" },
  { method: "get", path: "/v1/files/:file_id/content" },
  { method: "post", path: "/v1/uploads" },
  { method: "post", path: "/v1/uploads/:upload_id/parts" },
  { method: "post", path: "/v1/uploads/:upload_id/complete" },
  { method: "post", path: "/v1/uploads/:upload_id/cancel" },
  { method: "get", path: "/v1/batches" },
  { method: "post", path: "/v1/batches" },
  { method: "get", path: "/v1/batches/:batch_id" },
  { method: "post", path: "/v1/batches/:batch_id/cancel" },
  { method: "all", path: "/v1/fine_tuning/alpha/graders/run" },
  { method: "all", path: "/v1/fine_tuning/alpha/graders/validate" },
  { method: "all", path: "/v1/fine_tuning/checkpoints/:fine_tuned_model_checkpoint/permissions" },
  {
    method: "all",
    path: "/v1/fine_tuning/checkpoints/:fine_tuned_model_checkpoint/permissions/:permission_id"
  },
  { method: "get", path: "/v1/fine_tuning/jobs" },
  { method: "post", path: "/v1/fine_tuning/jobs" },
  { method: "get", path: "/v1/fine_tuning/jobs/:fine_tuning_job_id" },
  { method: "post", path: "/v1/fine_tuning/jobs/:fine_tuning_job_id/cancel" },
  { method: "get", path: "/v1/fine_tuning/jobs/:fine_tuning_job_id/events" },
  { method: "get", path: "/v1/fine_tuning/jobs/:fine_tuning_job_id/checkpoints" },
  { method: "all", path: "/v1/fine_tuning/jobs/:fine_tuning_job_id/pause" },
  { method: "all", path: "/v1/fine_tuning/jobs/:fine_tuning_job_id/resume" },
  { method: "get", path: "/v1/vector_stores" },
  { method: "post", path: "/v1/vector_stores" },
  { method: "get", path: "/v1/vector_stores/:vector_store_id" },
  { method: "post", path: "/v1/vector_stores/:vector_store_id" },
  { method: "delete", path: "/v1/vector_stores/:vector_store_id" },
  { method: "post", path: "/v1/vector_stores/:vector_store_id/search" },
  { method: "get", path: "/v1/vector_stores/:vector_store_id/files" },
  { method: "post", path: "/v1/vector_stores/:vector_store_id/files" },
  { method: "get", path: "/v1/vector_stores/:vector_store_id/files/:file_id" },
  { method: "delete", path: "/v1/vector_stores/:vector_store_id/files/:file_id" },
  { method: "all", path: "/v1/vector_stores/:vector_store_id/files/:file_id/content" },
  { method: "get", path: "/v1/vector_stores/:vector_store_id/file_batches" },
  { method: "post", path: "/v1/vector_stores/:vector_store_id/file_batches" },
  { method: "all", path: "/v1/vector_stores/:vector_store_id/file_batches/:batch_id" },
  { method: "all", path: "/v1/vector_stores/:vector_store_id/file_batches/:batch_id/cancel" },
  { method: "all", path: "/v1/vector_stores/:vector_store_id/file_batches/:batch_id/files" },
  { method: "get", path: "/v1/assistants" },
  { method: "post", path: "/v1/assistants" },
  { method: "get", path: "/v1/assistants/:assistant_id" },
  { method: "post", path: "/v1/assistants/:assistant_id" },
  { method: "delete", path: "/v1/assistants/:assistant_id" },
  { method: "post", path: "/v1/threads" },
  { method: "all", path: "/v1/threads/runs" },
  { method: "get", path: "/v1/threads/:thread_id" },
  { method: "post", path: "/v1/threads/:thread_id" },
  { method: "delete", path: "/v1/threads/:thread_id" },
  { method: "get", path: "/v1/threads/:thread_id/messages" },
  { method: "post", path: "/v1/threads/:thread_id/messages" },
  { method: "all", path: "/v1/threads/:thread_id/messages/:message_id" },
  { method: "get", path: "/v1/threads/:thread_id/runs" },
  { method: "post", path: "/v1/threads/:thread_id/runs" },
  { method: "get", path: "/v1/threads/:thread_id/runs/:run_id" },
  { method: "post", path: "/v1/threads/:thread_id/runs/:run_id" },
  { method: "post", path: "/v1/threads/:thread_id/runs/:run_id/cancel" },
  { method: "all", path: "/v1/threads/:thread_id/runs/:run_id/steps" },
  { method: "all", path: "/v1/threads/:thread_id/runs/:run_id/steps/:step_id" },
  { method: "all", path: "/v1/threads/:thread_id/runs/:run_id/submit_tool_outputs" },
  { method: "get", path: "/v1/containers" },
  { method: "post", path: "/v1/containers" },
  { method: "get", path: "/v1/containers/:container_id" },
  { method: "delete", path: "/v1/containers/:container_id" },
  { method: "all", path: "/v1/containers/:container_id/files" },
  { method: "all", path: "/v1/containers/:container_id/files/:file_id" },
  { method: "all", path: "/v1/containers/:container_id/files/:file_id/content" },
  { method: "all", path: "/v1/conversations" },
  { method: "all", path: "/v1/conversations/:conversation_id" },
  { method: "all", path: "/v1/conversations/:conversation_id/items" },
  { method: "all", path: "/v1/conversations/:conversation_id/items/:item_id" },
  { method: "all", path: "/v1/evals" },
  { method: "all", path: "/v1/evals/:eval_id" },
  { method: "all", path: "/v1/evals/:eval_id/runs" },
  { method: "all", path: "/v1/evals/:eval_id/runs/:run_id" },
  { method: "all", path: "/v1/evals/:eval_id/runs/:run_id/output_items" },
  { method: "all", path: "/v1/evals/:eval_id/runs/:run_id/output_items/:output_item_id" },
  { method: "all", path: "/v1/organization/admin_api_keys" },
  { method: "all", path: "/v1/organization/admin_api_keys/:key_id" },
  { method: "all", path: "/v1/organization/audit_logs" },
  { method: "all", path: "/v1/organization/certificates" },
  { method: "all", path: "/v1/organization/certificates/activate" },
  { method: "all", path: "/v1/organization/certificates/deactivate" },
  { method: "all", path: "/v1/organization/certificates/:certificate_id" },
  { method: "all", path: "/v1/organization/costs" },
  { method: "all", path: "/v1/organization/groups" },
  { method: "all", path: "/v1/organization/groups/:group_id" },
  { method: "all", path: "/v1/organization/groups/:group_id/roles" },
  { method: "all", path: "/v1/organization/groups/:group_id/roles/:role_id" },
  { method: "all", path: "/v1/organization/groups/:group_id/users" },
  { method: "all", path: "/v1/organization/groups/:group_id/users/:user_id" },
  { method: "all", path: "/v1/organization/invites" },
  { method: "all", path: "/v1/organization/invites/:invite_id" },
  { method: "all", path: "/v1/organization/projects" },
  { method: "all", path: "/v1/organization/projects/:project_id" },
  { method: "all", path: "/v1/organization/projects/:project_id/archive" },
  { method: "all", path: "/v1/organization/projects/:project_id/api_keys" },
  { method: "all", path: "/v1/organization/projects/:project_id/api_keys/:api_key_id" },
  { method: "all", path: "/v1/organization/projects/:project_id/certificates" },
  { method: "all", path: "/v1/organization/projects/:project_id/certificates/activate" },
  { method: "all", path: "/v1/organization/projects/:project_id/certificates/deactivate" },
  { method: "all", path: "/v1/organization/projects/:project_id/groups" },
  { method: "all", path: "/v1/organization/projects/:project_id/groups/:group_id" },
  { method: "all", path: "/v1/organization/projects/:project_id/rate_limits" },
  { method: "all", path: "/v1/organization/projects/:project_id/rate_limits/:rate_limit_id" },
  { method: "all", path: "/v1/organization/projects/:project_id/service_accounts" },
  { method: "all", path: "/v1/organization/projects/:project_id/service_accounts/:service_account_id" },
  { method: "all", path: "/v1/organization/projects/:project_id/users" },
  { method: "all", path: "/v1/organization/projects/:project_id/users/:user_id" },
  { method: "all", path: "/v1/organization/roles" },
  { method: "all", path: "/v1/organization/roles/:role_id" },
  { method: "all", path: "/v1/organization/users" },
  { method: "all", path: "/v1/organization/users/:user_id" },
  { method: "all", path: "/v1/organization/users/:user_id/roles" },
  { method: "all", path: "/v1/organization/users/:user_id/roles/:role_id" },
  { method: "all", path: "/v1/organization/usage/audio_speeches" },
  { method: "all", path: "/v1/organization/usage/audio_transcriptions" },
  { method: "all", path: "/v1/organization/usage/code_interpreter_sessions" },
  { method: "all", path: "/v1/organization/usage/completions" },
  { method: "all", path: "/v1/organization/usage/embeddings" },
  { method: "all", path: "/v1/organization/usage/images" },
  { method: "all", path: "/v1/organization/usage/moderations" },
  { method: "all", path: "/v1/organization/usage/vector_stores" },
  { method: "all", path: "/v1/projects/:project_id/groups/:group_id/roles" },
  { method: "all", path: "/v1/projects/:project_id/groups/:group_id/roles/:role_id" },
  { method: "all", path: "/v1/projects/:project_id/roles" },
  { method: "all", path: "/v1/projects/:project_id/roles/:role_id" },
  { method: "all", path: "/v1/projects/:project_id/users/:user_id/roles" },
  { method: "all", path: "/v1/projects/:project_id/users/:user_id/roles/:role_id" },
  { method: "all", path: "/v1/realtime/calls" },
  { method: "all", path: "/v1/realtime/calls/:call_id/accept" },
  { method: "all", path: "/v1/realtime/calls/:call_id/hangup" },
  { method: "all", path: "/v1/realtime/calls/:call_id/refer" },
  { method: "all", path: "/v1/realtime/calls/:call_id/reject" },
  { method: "all", path: "/v1/realtime/client_secrets" },
  { method: "all", path: "/v1/realtime/sessions" },
  { method: "all", path: "/v1/realtime/transcription_sessions" },
  { method: "all", path: "/v1/realtime/translations/client_secrets" },
  { method: "all", path: "/v1/videos" },
  { method: "all", path: "/v1/videos/characters" },
  { method: "all", path: "/v1/videos/characters/:character_id" },
  { method: "all", path: "/v1/videos/edits" },
  { method: "all", path: "/v1/videos/extensions" },
  { method: "all", path: "/v1/videos/:video_id" },
  { method: "all", path: "/v1/videos/:video_id/content" },
  { method: "all", path: "/v1/videos/:video_id/remix" },
  { method: "all", path: "/v1/skills" },
  { method: "all", path: "/v1/skills/:skill_id" },
  { method: "all", path: "/v1/skills/:skill_id/content" },
  { method: "all", path: "/v1/skills/:skill_id/versions" },
  { method: "all", path: "/v1/skills/:skill_id/versions/:version" },
  { method: "all", path: "/v1/skills/:skill_id/versions/:version/content" },
  { method: "all", path: "/v1/chatkit/sessions" },
  { method: "all", path: "/v1/chatkit/sessions/:session_id/cancel" },
  { method: "all", path: "/v1/chatkit/threads" },
  { method: "all", path: "/v1/chatkit/threads/:thread_id" },
  { method: "all", path: "/v1/chatkit/threads/:thread_id/items" }
];

/** Registers authenticated 501 responses for known but unsupported OpenAI-compatible endpoints. */
export function registerOpenAiUnsupportedRoutes<App extends AnyElysia>(app: App, services: Services): App {
  const unsupported = (endpoint: string) => (context: Record<string, unknown>) =>
    unsupportedOpenAiEndpoint(services, context.request as Request, endpoint);

  for (const route of unsupportedOpenAiRoutes) {
    switch (route.method) {
      case "all":
        app.all(route.path, unsupported(route.path));
        break;
      case "delete":
        app.delete(route.path, unsupported(route.path));
        break;
      case "get":
        app.get(route.path, unsupported(route.path));
        break;
      case "post":
        app.post(route.path, unsupported(route.path));
        break;
    }
  }

  return app;
}

function unsupportedOpenAiEndpoint(services: Services, request: Request, endpoint: string): Response {
  try {
    requireApiKey(services, request);
    return openAiUnsupportedResponse(endpoint);
  } catch (error) {
    return openAiErrorResponse(error);
  }
}
