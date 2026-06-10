/** Admin user displayed in the dashboard. */
export interface AdminUser {
  /** User id. */
  id: string;
  /** Login email. */
  email: string;
  /** User role. */
  role: string;
}

/** Adapter profile displayed in the dashboard. */
export interface AdapterProfileView {
  /** Profile id and OpenAI-compatible model id. */
  id: string;
  /** Adapter type. */
  type: string;
  /** Profile name. */
  name: string;
  /** Fixed working directory. */
  cwd: string;
  /** Enabled state. */
  enabled: boolean;
}

/** API key displayed in the dashboard. */
export interface ApiKeyView {
  /** API key id. */
  id: string;
  /** Operator-facing name. */
  name: string;
  /** Non-secret key prefix. */
  keyPrefix: string;
  /** Enabled flag. */
  enabled: number;
  /** One-time token returned during creation. */
  token?: string;
}

/** Run record displayed in the dashboard. */
export interface RunView {
  /** Run id. */
  id: string;
  /** Selected profile id. */
  profileId: string;
  /** Run status. */
  status: string;
  /** Prompt text. */
  prompt: string;
  /** Final output. */
  output: string | null;
  /** Error code if failed. */
  errorCode: string | null;
}
