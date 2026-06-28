/**
 * Extracts a user-friendly error message from any thrown value.
 *
 * Priority:
 *   1. Backend message in response body (NestJS sends { message: string | string[] })
 *   2. HTTP status-code fallback
 *   3. Network / timeout detection
 *   4. Caller-supplied fallback
 */
import { isAxiosError } from "axios";

const STATUS: Record<number, string> = {
  400: "Invalid request. Please check your input.",
  401: "Incorrect credentials. Please try again.",
  403: "You don't have permission to do that.",
  404: "Not found.",
  409: "This already exists.",
  422: "Invalid data. Please check your input.",
  429: "Too many attempts. Please wait a moment and try again.",
  500: "Server error. Please try again.",
  502: "Server is temporarily unavailable. Try again.",
  503: "Service unavailable. Try again shortly.",
};

export function apiError(e: unknown, fallback = "Something went wrong. Try again."): string {
  if (isAxiosError(e)) {
    // 1. Backend body message (highest priority — most specific and human-readable)
    const data = e.response?.data as Record<string, unknown> | undefined;
    if (data?.message) {
      const m = data.message;
      if (typeof m === "string" && m.length > 0) return m;
      if (Array.isArray(m) && m.length > 0 && typeof m[0] === "string") return m[0];
    }

    // 2. Status-code fallback
    if (e.response?.status && STATUS[e.response.status]) return STATUS[e.response.status];

    // 3. No response at all → network issue
    if (!e.response) return "Can't reach the server. Check your connection.";

    return fallback;
  }

  if (e instanceof Error) {
    if (/timeout|ECONNABORTED|aborted/i.test(e.message))
      return "The server took too long to respond. Try again.";
    if (/network|fetch|ECONNREFUSED/i.test(e.message))
      return "Can't reach the server. Check your connection.";
    if (e.message) return e.message;
  }

  return fallback;
}
