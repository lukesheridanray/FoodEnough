import { API_URL } from "./config";
import { authHeaders, removeToken } from "./auth";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * Wrapper around fetch that prepends API_URL, injects auth headers,
 * and throws UnauthorizedError on 401 responses.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    ...authHeaders(),
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    removeToken();
    throw new UnauthorizedError();
  }

  return res;
}
