"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CreatePasswordDialog } from "@/components/auth/create-password-dialog";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";

type LoginStep = "shainBangou" | "password";

export default function LoginPage() {
  const [shainBangou, setShainBangou] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<LoginStep>("shainBangou");
  const [isCheckingUser, setIsCheckingUser] = useState(false);

  const {
    login,
    loginWithMicrosoft,
    isLoading,
    error,
    clearError,
    showCreatePasswordDialog,
    createPassword,
    setShowCreatePasswordDialog,
  } = useAuthStore();
  const router = useRouter();

  /** Step 1: 社員番号を送信して、パスワードの有無を確認 */
  const handleCheckShainBangou = async () => {
    if (!shainBangou.trim()) return;

    const bangou = parseInt(shainBangou, 10);
    if (isNaN(bangou)) return;

    setIsCheckingUser(true);
    clearError();

    try {
      // パスワードなしでログイン試行
      // hasPassword=false ならそのまま成功する
      // hasPassword=true ならバックエンドがパスワード必須エラーを返す
      await login(bangou, undefined, rememberMe);
      // パスワードなしで成功した場合 → ホームへ（ダイアログは自動表示）
      router.push("/");
    } catch {
      // エラーの場合、パスワードが必要な可能性がある
      // ストアのエラーを確認して、パスワード入力ステップに進む
      setStep("password");
      clearError();
    } finally {
      setIsCheckingUser(false);
    }
  };

  /** Step 2: パスワードを使ってログイン */
  const handleLoginWithPassword = async () => {
    if (!shainBangou.trim() || !password) return;

    const bangou = parseInt(shainBangou, 10);
    if (isNaN(bangou)) return;

    try {
      await login(bangou, password, rememberMe);
      router.push("/");
    } catch {
      // エラーはストアで管理
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "shainBangou") {
      await handleCheckShainBangou();
    } else {
      await handleLoginWithPassword();
    }
  };

  const handleBack = () => {
    setStep("shainBangou");
    setPassword("");
    clearError();
  };

  const handleCreatePassword = async (
    pwd: string,
    confirmPwd: string,
  ) => {
    await createPassword(pwd, confirmPwd);
  };

  const handleSkipCreatePassword = () => {
    setShowCreatePasswordDialog(false);
  };

  const isSubmitting = isLoading || isCheckingUser;

  return (
    <>
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <Image
              src="/images/logo.jpg"
              alt="日報"
              width={64}
              height={64}
              className="rounded-xl"
              priority
            />
          </div>
          <CardTitle className="text-2xl">日報</CardTitle>
          <CardDescription>音頭金属株式会社</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-[hsl(var(--destructive)/0.1)] p-3 text-sm text-[hsl(var(--destructive))]">
                {error}
              </div>
            )}

            {/* 社員番号 */}
            <div className="space-y-2">
              <Label htmlFor="shainBangou">社員番号</Label>
              <Input
                id="shainBangou"
                type="number"
                placeholder="社員番号を入力"
                value={shainBangou}
                onChange={(e) => {
                  setShainBangou(e.target.value);
                  if (error) clearError();
                  // 社員番号が変わったらステップをリセット
                  if (step === "password") {
                    setStep("shainBangou");
                    setPassword("");
                  }
                }}
                required
                autoComplete="username"
                disabled={isSubmitting}
              />
            </div>

            {/* パスワード（Step 2 のみ表示） */}
            {step === "password" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">パスワード</Label>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-xs text-[hsl(var(--primary))] hover:underline"
                  >
                    戻る
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="パスワードを入力"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) clearError();
                    }}
                    required
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    className="pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={
                      showPassword ? "パスワードを隠す" : "パスワードを表示"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ログイン状態を保持する */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) =>
                  setRememberMe(checked === true)
                }
                disabled={isSubmitting}
              />
              <Label
                htmlFor="rememberMe"
                className="text-sm font-normal cursor-pointer"
              >
                ログイン状態を保持する
              </Label>
            </div>

            {/* ボタン */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              {step === "shainBangou" ? "次へ" : "ログイン"}
            </Button>
          </form>

          {/* 区切り線 */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[hsl(var(--border))]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[hsl(var(--card))] px-2 text-[hsl(var(--muted-foreground))]">
                  または
                </span>
              </div>
            </div>

            {/* Microsoft 365 SSO */}
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full"
              onClick={loginWithMicrosoft}
              disabled={isSubmitting}
            >
              <svg
                className="mr-2 h-4 w-4"
                viewBox="0 0 21 21"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
              Microsoft 365 でサインイン
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* パスワード作成ダイアログ */}
      <CreatePasswordDialog
        open={showCreatePasswordDialog}
        onSkip={handleSkipCreatePassword}
        onSubmit={handleCreatePassword}
      />
    </>
  );
}
