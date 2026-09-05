export function backendApiUrl(path) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || (process.env.NODE_ENV === "production" ? "https://lynoralink.onrender.com" : "");
    const backendPaths = ["/api/posts", "/api/reels", "/api/messages", "/api/calls", "/api/settings", "/api/sessions", "/api/account", "/api/auth/2fa", "/api/profile", "/api/register", "/api/verify-email", "/api/forgot-password", "/api/reset-password", "/api/upload", "/api/connections", "/api/network-lists", "/api/stories", "/api/users", "/api/company", "/api/groups", "/api/notifications", "/api/stats", "/api/status", "/api/subscription", "/api/stripe/sync", "/api/push", "/api/ads", "/api/assistant", "/api/ai-image", "/api/ai-article", "/api/support", "/api/admin/reports"];
  const migratedPaths = ["/api/assistant", "/api/ai-image", "/api/ai-article", "/api/support", "/api/presence"];
  if (backendUrl && migratedPaths.some((prefix) => path.startsWith(prefix))) return `/v1${path.slice(4)}`;
  if (!backendUrl || (!backendPaths.some((prefix) => path.startsWith(prefix)) && path !== "/api/presence")) return path;
  return `/v1${path.slice(4)}`;
}

export function fetchBackendApi(path, options = {}) {
  return fetch(backendApiUrl(path), {
    credentials: "include",
    ...options,
  });
}
