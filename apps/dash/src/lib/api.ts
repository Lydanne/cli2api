/** Fetch-compatible function used by the dashboard API client. */
export type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** Error thrown when a backend API request fails. */
export class ApiError extends Error {
  /** Stable backend error code. */
  public readonly code: string;

  /** HTTP response status. */
  public readonly status: number;

  /** Creates a dashboard API error. */
  public constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/** Small JSON API client for the operator dashboard. */
export class ApiClient {
  /** Creates a dashboard API client. */
  public constructor(
    private readonly baseUrl = "",
    private readonly fetcher: Fetcher = defaultFetcher
  ) {}

  /** Sends a GET request and parses JSON. */
  public get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  /** Sends a POST JSON request and parses JSON. */
  public post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      credentials: "include",
      ...init
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string };
    };
    if (!response.ok) {
      throw new ApiError(
        payload.error?.code ?? "REQUEST_FAILED",
        payload.error?.message ?? response.statusText,
        response.status
      );
    }
    return payload as T;
  }
}

function defaultFetcher(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return globalThis.fetch(input, init);
}
