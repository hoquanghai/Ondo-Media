# Phase 01 — Project Setup

## Objectives

- Next.js 15 (App Router) プロジェクトを作成し、開発基盤を構築する
- 必要な依存パッケージをすべてインストールする
- Tailwind CSS 4、shadcn/ui、Zustand 等の設定を完了する
- パスエイリアス・API クライアント・環境設定を整備する
- 日本語フォント (Noto Sans JP) を適用する

## Prerequisites

- Node.js >= 20.x
- npm >= 10.x または pnpm >= 9.x
- Git

## Tasks

### 1. Next.js 15 プロジェクト作成

```bash
npx create-next-app@latest internal-social-frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

生成されるディレクトリ構造:

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
├── hooks/
├── lib/
├── stores/
└── types/
```

### 2. 依存パッケージインストール

```bash
# UI / スタイリング
npm install tailwindcss@4 @tailwindcss/postcss postcss
npm install lucide-react
npm install date-fns

# 状態管理
npm install zustand

# リアルタイム通信
npm install socket.io-client

# shadcn/ui 初期化
npx shadcn@latest init

# 開発用
npm install -D @types/node @types/react @types/react-dom
```

### 3. Tailwind CSS 4 設定

**File: `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1e3a8a",
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e3a8a",
          900: "#1e3a8a",
        },
        secondary: {
          DEFAULT: "#64748b",
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        success: "#16a34a",
        warning: "#f59e0b",
        danger: "#dc2626",
        background: "#f8fafc",
        surface: "#ffffff",
        border: "#e2e8f0",
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', "sans-serif"],
      },
      screens: {
        mobile: "0px",
        tablet: "768px",
        desktop: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
```

### 4. Noto Sans JP フォント設定

**File: `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "コープネット - 社内SNS",
  description: "社内コミュニケーションプラットフォーム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={notoSansJP.variable}>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
```

### 5. パスエイリアス設定

**File: `tsconfig.json`** (paths セクション)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/stores/*": ["./src/stores/*"],
      "@/types/*": ["./src/types/*"]
    }
  }
}
```

### 6. 環境設定ファイル

**File: `.env.local`**

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=コープネット
```

**File: `src/lib/env.ts`**

```ts
export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api",
  wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "コープネット",
} as const;
```

### 7. API クライアント作成

**File: `src/lib/api.ts`**

```ts
import { env } from "./env";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string>;
};

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return url.toString();
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {}, params } = options;
    const token = this.getAuthToken();

    const response = await fetch(this.buildUrl(path, params), {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      // トークン期限切れ — リフレッシュまたはログアウト
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, error.message ?? "エラーが発生しました");
    }

    return response.json();
  }

  get<T>(path: string, params?: Record<string, string>) {
    return this.request<T>(path, { method: "GET", params });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: "POST", body });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: "PUT", body });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: "PATCH", body });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = new ApiClient(env.apiBaseUrl);
```

### 8. shadcn/ui コンポーネント初期化

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add dropdown-menu
npx shadcn@latest add skeleton
npx shadcn@latest add toast
npx shadcn@latest add tabs
npx shadcn@latest add calendar
npx shadcn@latest add separator
npx shadcn@latest add scroll-area
```

インストール後の `src/components/ui/` ディレクトリ:

```
src/components/ui/
├── avatar.tsx
├── badge.tsx
├── button.tsx
├── calendar.tsx
├── card.tsx
├── dialog.tsx
├── dropdown-menu.tsx
├── input.tsx
├── scroll-area.tsx
├── separator.tsx
├── skeleton.tsx
├── tabs.tsx
├── textarea.tsx
└── toast.tsx
```

### 9. グローバル CSS

**File: `src/app/globals.css`**

```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 210 40% 98%;
    --foreground: 222 84% 5%;
    --primary: 224 76% 33%;
    --primary-foreground: 210 40% 98%;
    --secondary: 215 16% 47%;
    --secondary-foreground: 222 84% 5%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --accent: 210 40% 96%;
    --accent-foreground: 222 84% 5%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 210 40% 98%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 224 76% 33%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

## Verification Checklist

- [ ] `npm run dev` でエラーなく起動する
- [ ] `http://localhost:3000` にアクセスできる
- [ ] Noto Sans JP フォントが適用されている (DevTools で確認)
- [ ] Tailwind CSS のカスタムカラー (`bg-primary` 等) が動作する
- [ ] パスエイリアス (`@/lib/api` 等) が解決される
- [ ] shadcn/ui の Button コンポーネントがレンダリングできる
- [ ] `src/lib/api.ts` が TypeScript エラーなくコンパイルされる
- [ ] `src/lib/env.ts` で環境変数が取得できる
- [ ] ESLint エラーがない (`npm run lint`)
- [ ] TypeScript エラーがない (`npx tsc --noEmit`)

## Files Created / Modified

| ファイル | 操作 | 概要 |
|---|---|---|
| `tailwind.config.ts` | 作成 | カスタムカラー・フォント・ブレークポイント設定 |
| `tsconfig.json` | 修正 | パスエイリアス追加 |
| `.env.local` | 作成 | 環境変数定義 |
| `src/app/layout.tsx` | 修正 | Noto Sans JP フォント・メタデータ設定 |
| `src/app/globals.css` | 修正 | CSS カスタムプロパティ・Tailwind 設定 |
| `src/lib/env.ts` | 作成 | 環境変数アクセスユーティリティ |
| `src/lib/api.ts` | 作成 | API クライアント (fetch ラッパー) |
| `src/components/ui/*.tsx` | 作成 | shadcn/ui コンポーネント群 (14 ファイル) |
