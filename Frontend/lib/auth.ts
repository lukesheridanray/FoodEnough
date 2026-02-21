export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem("token", token);
  } catch {
    // Storage full or unavailable (private browsing)
  }
}

export function removeToken(): void {
  try {
    localStorage.removeItem("token");
  } catch {
    // Storage unavailable
  }
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/** Safe localStorage getter with fallback */
export function safeGetItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Safe localStorage setter */
export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage full or unavailable
  }
}
