const REFRESH_INTERVAL_MS = 14 * 60 * 1000; // 14分 (トークン有効期限15分前提)

let refreshTimer: ReturnType<typeof setInterval> | null = null;

export function startTokenRefresh(refreshFn: () => Promise<void>) {
  stopTokenRefresh();
  refreshTimer = setInterval(refreshFn, REFRESH_INTERVAL_MS);
}

export function stopTokenRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
