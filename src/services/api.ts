import axios, { create, type AxiosRequestConfig, isAxiosError } from "axios";
import { getGuestIdentity } from "@/services/deviceId";

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";
export const apiEnabled = API_BASE.length > 0;

// Imported lazily to avoid circular dependency (authStore → api → authStore).
// Both modules are singletons so lazy import is fine.
function getAuthStore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@/store/authStore").useAuthStore as typeof import("@/store/authStore").useAuthStore;
}

// 30s: a cold serverless backend (Neon wake + first Redis TLS connect) can take
// well over 15s on the first request, which otherwise surfaces as a misleading
// "check your API URL" timeout error on the very first auth call.
const client = create({ baseURL: API_BASE, timeout: 30000 });

// ── Request: inject auth headers ──────────────────────────────────────────────

client.interceptors.request.use(async (config) => {
  const { accessToken, isGuest } = getAuthStore().getState();
  if (accessToken && !isGuest) {
    config.headers["Authorization"] = `Bearer ${accessToken}`;
  } else {
    const { guestKey, deviceId, hardwareId } = await getGuestIdentity();
    config.headers["X-Guest-Key"] = guestKey;
    config.headers["X-Device-Id"] = deviceId;
    if (hardwareId) config.headers["X-Hardware-Id"] = hardwareId;
  }
  return config;
});

// ── Response: 401 → refresh → retry once ─────────────────────────────────────

let refreshPromise: Promise<string | null> | null = null;

client.interceptors.response.use(
  (res) => res,
  async (err: unknown) => {
    if (!isAxiosError(err) || err.response?.status !== 401) throw err;

    const originalConfig = err.config;
    if (!originalConfig) throw err;

    // Prevent infinite retry loops (already retried or is the refresh call itself)
    if ((originalConfig as AxiosRequestConfig & { _retry?: boolean })._retry) throw err;
    if (originalConfig.url?.endsWith("/auth/refresh")) throw err;

    const store = getAuthStore().getState();
    const { refreshToken } = store;
    if (!refreshToken) {
      void store.signOut();
      throw err;
    }

    // Deduplicate: if a refresh is already in-flight, wait for it
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const res = await axios.post<{ accessToken: string; refreshToken: string }>(
            `${API_BASE}/auth/refresh`,
            { refreshToken },
            { timeout: 10000 },
          );
          const { accessToken, refreshToken: newRefresh } = res.data;
          await getAuthStore().getState().updateAccessToken(accessToken, newRefresh);
          return accessToken;
        } catch {
          void getAuthStore().getState().signOut();
          return null;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    const newToken = await refreshPromise;
    if (!newToken) throw err;

    (originalConfig as AxiosRequestConfig & { _retry?: boolean })._retry = true;
    originalConfig.headers = originalConfig.headers ?? {};
    originalConfig.headers["Authorization"] = `Bearer ${newToken}`;
    return client.request(originalConfig);
  },
);

// ── Public API ────────────────────────────────────────────────────────────────

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  if (!apiEnabled) throw new Error("API disabled: EXPO_PUBLIC_API_URL not set");
  const res = await client.request<T>(config);
  return res.data;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>({ method: "GET", url: path });
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return request<T>({ method: "PUT", url: path, data: body });
}

export function apiPost<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  return request<T>({ method: "POST", url: path, data: body, headers });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>({ method: "PATCH", url: path, data: body });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>({ method: "DELETE", url: path });
}

// ponytail: kept setAuthTokenGetter as a no-op so existing callers don't break
// while we migrate. Remove once _layout.tsx is updated.
export function setAuthTokenGetter(_fn: (() => Promise<string | null>) | null) {}
