/**
 * API origin:
 * - Set `VITE_API_URL` in production if the API is on another host.
 * - In dev, leave it unset to use same-origin `/api` (see `vite.config.ts` proxy).
 *
 * Note: This file must NOT be named `api.ts` at project root — Vite's `/api` proxy
 * would intercept `/api.ts` and break the app.
 */
export function getApiOrigin(): string {
  const env = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  if (env) return env;
  if (import.meta.env.DEV) return "";
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "http://localhost:5000";
}

/**
 * Socket.IO must hit the real API host. Proxying `/socket.io` through Vite often
 * throws `write ECONNABORTED` when the backend restarts or reconnects.
 */
export function getSocketOrigin(): string {
  const env = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  if (env) return env;
  if (import.meta.env.DEV) return "http://127.0.0.1:5000";
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "http://127.0.0.1:5000";
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const origin = getApiOrigin();
  return origin ? `${origin}${normalized}` : normalized;
}
