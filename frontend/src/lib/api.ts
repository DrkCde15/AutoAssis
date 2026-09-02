const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type FetchOptions = RequestInit & {
  json?: unknown;
};

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { json, ...init } = options;

  const headers = new Headers(init.headers);

  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(json);
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string, init?: FetchOptions) =>
    request<T>(endpoint, { method: "GET", ...init }),

  post: <T>(endpoint: string, json?: unknown, init?: FetchOptions) =>
    request<T>(endpoint, { method: "POST", json, ...init }),

  put: <T>(endpoint: string, json?: unknown, init?: FetchOptions) =>
    request<T>(endpoint, { method: "PUT", json, ...init }),

  delete: <T>(endpoint: string, init?: FetchOptions) =>
    request<T>(endpoint, { method: "DELETE", ...init }),
};
