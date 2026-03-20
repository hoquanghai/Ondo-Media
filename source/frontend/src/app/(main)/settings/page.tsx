"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Eye, EyeOff, Camera, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { authApi } from "@/lib/auth-api";
import { userApi, type UserDetailProfile } from "@/lib/user-api";
import { APP } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";
import { PageHeader } from "@/components/shared/page-header";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState<UserDetailProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Profile form state
  const [shainName, setShainName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [address1, setAddress1] = useState("");
  const [snsBio, setSnsBio] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const hasPassword = profile?.hasPassword ?? user?.hasPassword ?? false;

  const loadProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    try {
      const data = await userApi.getMyProfile();
      setProfile(data);
      setShainName(data.shainName ?? "");
      setEmail(data.email ?? "");
      setPhone(data.phone ?? "");
      setBirthday(data.birthday ?? "");
      setAddress1(data.address1 ?? "");
      setSnsBio(data.snsBio ?? "");
    } catch {
      toast({
        title: "エラー",
        description: "プロフィールの読み込みに失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProfile(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // --- Avatar handling ---
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!(APP.ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      toast({
        title: "エラー",
        description: "JPEG、PNG、GIF、WebP形式の画像を選択してください",
        variant: "destructive",
      });
      return;
    }

    if (file.size > APP.FILE_MAX_SIZE) {
      toast({
        title: "エラー",
        description: "ファイルサイズは10MB以下にしてください",
        variant: "destructive",
      });
      return;
    }

    // Show preview immediately
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    // Upload
    setIsUploadingAvatar(true);
    try {
      const result = await userApi.uploadAvatar(file);
      setProfile((prev) => prev ? { ...prev, snsAvatarUrl: result.url } : prev);
      if (user) {
        setUser({ ...user, snsAvatarUrl: result.url });
      }
      toast({
        title: "アバターを更新しました",
      });
    } catch {
      // Even if upload fails, keep the preview for UX
      toast({
        title: "エラー",
        description: "アバターのアップロードに失敗しました。プロフィール保存時に再試行します。",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // --- Profile save ---
  const handleSaveProfile = async () => {
    if (!shainName.trim()) {
      toast({
        title: "エラー",
        description: "表示名を入力してください",
        variant: "destructive",
      });
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await userApi.updateMyProfile({
        shainName: shainName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        birthday: birthday || null,
        address1: address1.trim() || null,
        snsBio: snsBio.trim() || null,
      });
      setProfile(updated);

      // Update auth store user
      if (user) {
        setUser({
          ...user,
          shainName: updated.shainName,
          email: updated.email,
          snsAvatarUrl: updated.snsAvatarUrl ?? undefined,
        });
      }

      toast({
        title: "プロフィールを更新しました",
      });
    } catch {
      toast({
        title: "エラー",
        description: "プロフィールの更新に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --- Password save ---
  const handleSavePassword = async () => {
    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError("パスワードは6文字以上で設定してください");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("新しいパスワードが一致しません");
      return;
    }

    if (hasPassword && !currentPassword) {
      setPasswordError("現在のパスワードを入力してください");
      return;
    }

    setIsSavingPassword(true);
    try {
      if (hasPassword) {
        await authApi.changePassword(currentPassword, newPassword);
      } else {
        await authApi.createPassword(newPassword, confirmPassword);
      }

      // Update hasPassword in profile and auth store
      setProfile((prev) => (prev ? { ...prev, hasPassword: true } : prev));
      if (user) {
        setUser({ ...user, hasPassword: true });
      }

      toast({
        title: hasPassword
          ? "パスワードを変更しました"
          : "パスワードを設定しました",
      });

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast({
        title: "エラー",
        description: hasPassword
          ? "パスワードの変更に失敗しました。現在のパスワードを確認してください。"
          : "パスワードの設定に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  // --- Format date for display ---
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "ー";
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    } catch {
      return dateStr;
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="max-w-3xl mx-auto">
        <PageHeader title="設定" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="設定" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="profile">プロフィール</TabsTrigger>
          <TabsTrigger value="password">パスワード</TabsTrigger>
        </TabsList>

        {/* ========== Tab 1: Profile ========== */}
        <TabsContent value="profile">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Avatar section */}
                <div className="flex flex-col items-center gap-3 md:min-w-[160px]">
                  <div className="relative">
                    {avatarPreview ? (
                      <div className="h-24 w-24 rounded-full overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={avatarPreview}
                          alt="プレビュー"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <UserAvatar
                        shainName={profile?.shainName ?? user?.shainName ?? ""}
                        avatar={profile?.avatar ?? user?.avatar}
                        snsAvatarUrl={profile?.snsAvatarUrl ?? user?.snsAvatarUrl}
                        size="xl"
                        className="h-24 w-24"
                      />
                    )}
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAvatarClick}
                    disabled={isUploadingAvatar}
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    写真を変更
                  </Button>
                </div>

                {/* Form section */}
                <div className="flex-1 space-y-4">
                  {/* 社員番号 (read-only) */}
                  <div className="space-y-1.5">
                    <Label className="text-[hsl(var(--muted-foreground))]">
                      社員番号
                    </Label>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] rounded-md px-3 py-2">
                      {profile?.lastNumber ?? user?.lastNumber}
                    </p>
                  </div>

                  {/* 表示名 */}
                  <div className="space-y-1.5">
                    <Label htmlFor="shainName">表示名</Label>
                    <Input
                      id="shainName"
                      value={shainName}
                      onChange={(e) => setShainName(e.target.value)}
                      placeholder="表示名を入力"
                    />
                  </div>

                  {/* メールアドレス */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email">メールアドレス</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@example.co.jp"
                    />
                  </div>

                  {/* 電話番号 */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">電話番号</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="080-xxxx-xxxx"
                    />
                  </div>

                  {/* 生年月日 */}
                  <div className="space-y-1.5">
                    <Label htmlFor="birthday">生年月日</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                    />
                  </div>

                  {/* 住所 */}
                  <div className="space-y-1.5">
                    <Label htmlFor="address1">住所</Label>
                    <Input
                      id="address1"
                      value={address1}
                      onChange={(e) => setAddress1(e.target.value)}
                      placeholder="住所を入力"
                    />
                  </div>

                  {/* 自己紹介 */}
                  <div className="space-y-1.5">
                    <Label htmlFor="snsBio">自己紹介</Label>
                    <Textarea
                      id="snsBio"
                      value={snsBio}
                      onChange={(e) => setSnsBio(e.target.value)}
                      placeholder="自己紹介を入力"
                      rows={3}
                    />
                  </div>

                  {/* Read-only section */}
                  <Separator className="my-4" />
                  <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                    所属情報（変更不可）
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[hsl(var(--muted-foreground))] text-xs">
                        部署
                      </Label>
                      <p className="text-sm bg-[hsl(var(--muted))] rounded-md px-3 py-2 text-[hsl(var(--muted-foreground))]">
                        {profile?.shainGroup || "ー"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[hsl(var(--muted-foreground))] text-xs">
                        役職
                      </Label>
                      <p className="text-sm bg-[hsl(var(--muted))] rounded-md px-3 py-2 text-[hsl(var(--muted-foreground))]">
                        {profile?.shainYaku || "ー"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[hsl(var(--muted-foreground))] text-xs">
                        入社日
                      </Label>
                      <p className="text-sm bg-[hsl(var(--muted))] rounded-md px-3 py-2 text-[hsl(var(--muted-foreground))]">
                        {formatDate(profile?.entranceDate ?? null)}
                      </p>
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                    >
                      {isSavingProfile && (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      )}
                      変更を保存
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== Tab 2: Password ========== */}
        <TabsContent value="password">
          <Card>
            <CardContent className="pt-6">
              <div className="max-w-md mx-auto space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">パスワードの変更</h2>
                  {!hasPassword && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                      ※ パスワードが未設定の場合は、新しいパスワードのみ入力してください
                    </p>
                  )}
                </div>

                {/* Current password (only shown if user has password) */}
                {hasPassword && (
                  <div className="space-y-1.5">
                    <Label htmlFor="currentPassword">現在のパスワード</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="現在のパスワードを入力"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* New password */}
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">新しいパスワード</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPasswordError("");
                      }}
                      placeholder="新しいパスワードを入力"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm new password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">
                    新しいパスワード（確認）
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordError("");
                      }}
                      placeholder="新しいパスワードを再入力"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  ※ 6文字以上で設定してください
                </p>

                {passwordError && (
                  <p className="text-sm text-[hsl(var(--destructive))]">
                    {passwordError}
                  </p>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={handleSavePassword}
                    disabled={isSavingPassword}
                  >
                    {isSavingPassword && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    {hasPassword ? "パスワードを変更" : "パスワードを設定"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
