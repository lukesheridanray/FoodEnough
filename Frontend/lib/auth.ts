export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string): void {
  localStorage.setItem("token", token);
}

export function removeToken(): void {
  localStorage.removeItem("token");
}

export const COMMON_HEADERS: Record<string, string> = {
  "ngrok-skip-browser-warning": "true",
};

export function authHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return { ...COMMON_HEADERS };
  return { Authorization: `Bearer ${token}`, ...COMMON_HEADERS };
}
