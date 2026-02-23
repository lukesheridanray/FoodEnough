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

/** Get the user's preferred timezone (IANA string like "America/New_York") */
export function getTimezone(): string {
  const saved = safeGetItem("timezone");
  if (saved) return saved;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/** Get the UTC offset in minutes for the user's preferred timezone */
export function getTzOffsetMinutes(): number {
  const tz = getTimezone();
  try {
    // Calculate offset by comparing UTC time to local time in the target timezone
    const now = new Date();
    const utcStr = now.toLocaleString("en-US", { timeZone: "UTC" });
    const tzStr = now.toLocaleString("en-US", { timeZone: tz });
    const utcDate = new Date(utcStr);
    const tzDate = new Date(tzStr);
    return Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
  } catch {
    return -new Date().getTimezoneOffset();
  }
}

/**
 * Parse a timestamp from the backend as UTC.
 * Backend returns naive UTC datetimes without "Z" suffix,
 * so JS would treat them as local time. This ensures UTC.
 */
function parseUtc(timestamp: string): Date {
  if (!timestamp.endsWith("Z") && !timestamp.includes("+") && !/\d{2}-\d{2}:\d{2}$/.test(timestamp)) {
    return new Date(timestamp + "Z");
  }
  return new Date(timestamp);
}

/** Format a UTC timestamp string in the user's preferred timezone */
export function formatTime(timestamp: string): string {
  const tz = getTimezone();
  try {
    return parseUtc(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    });
  } catch {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

/** Format a UTC timestamp as a date string in the user's preferred timezone */
export function formatDate(timestamp: string, options?: Intl.DateTimeFormatOptions): string {
  const tz = getTimezone();
  const defaults: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  try {
    return parseUtc(timestamp).toLocaleDateString("en-US", { ...defaults, ...options, timeZone: tz });
  } catch {
    return new Date(timestamp).toLocaleDateString("en-US", { ...defaults, ...options });
  }
}
