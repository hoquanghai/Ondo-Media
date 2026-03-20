export const env = {
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1",
  wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3026",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "日報",
} as const;
