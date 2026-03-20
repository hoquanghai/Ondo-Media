"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProfileStore } from "@/stores/profile-store";
import type { UserProfile } from "@/types/profile";

interface ProfileEditorProps {
  profile: UserProfile;
}

export function ProfileEditor({ profile }: ProfileEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [shainName, setShainName] = useState(profile.shainName);
  const [snsBio, setSnsBio] = useState(profile.snsBio || profile.bio);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateProfile } = useProfileStore();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        shainName,
        snsBio,
        avatar: avatarFile ?? undefined,
      });
      setIsEditing(false);
      setAvatarPreview(null);
      setAvatarFile(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setShainName(profile.shainName);
    setSnsBio(profile.snsBio || profile.bio);
    setAvatarPreview(null);
    setAvatarFile(null);
    setIsEditing(false);
  };

  const avatarSrc =
    avatarPreview ?? profile.snsAvatarUrl || profile.avatar || undefined;

  return (
    <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
      {/* Avatar */}
      <div className="relative">
        <Avatar className="h-24 w-24">
          <AvatarImage src={avatarSrc} />
          <AvatarFallback className="text-2xl bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] text-white">
            {profile.shainName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        {isEditing && (
          <button
            className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center shadow"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleAvatarChange}
        />
      </div>

      {/* Info */}
      <div className="flex-1 text-center sm:text-left space-y-2 w-full max-w-md">
        {isEditing ? (
          <>
            <Input
              value={shainName}
              onChange={(e) => setShainName(e.target.value)}
              placeholder="表示名"
              className="font-bold"
            />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {profile.shainGroup} ・ {profile.shainYaku}
            </p>
            <Textarea
              value={snsBio}
              onChange={(e) => setSnsBio(e.target.value)}
              placeholder="自己紹介を入力..."
              rows={3}
            />
            <div className="flex gap-2 justify-center sm:justify-start">
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                保存
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                キャンセル
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold">{profile.shainName}</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {profile.shainGroup} ・ {profile.shainYaku}
            </p>
            {(profile.snsBio || profile.bio) && (
              <p className="text-sm">{profile.snsBio || profile.bio}</p>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              プロフィールを編集
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
