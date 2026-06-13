const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...init } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ?? `HTTP ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, token: string) => apiFetch<T>(path, { token }),
  post: <T>(path: string, body: unknown, token: string) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body), token }),
  patch: <T>(path: string, body: unknown, token: string) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body), token }),
  delete: <T>(path: string, token: string) =>
    apiFetch<T>(path, { method: "DELETE", token }),
};
