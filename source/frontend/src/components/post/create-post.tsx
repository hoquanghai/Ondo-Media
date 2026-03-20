"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import {
  ImageIcon,
  Video,
  Paperclip,
  CalendarDays,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { UserAvatar } from "@/components/shared/user-avatar";
import { usePostStore } from "@/stores/post-store";
import { useAuthStore } from "@/stores/auth-store";

export function CreatePost() {
  const [content, setContent] = useState("");
  const [postDate, setPostDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { createPost, isCreating } = usePostStore();
  const user = useAuthStore((s) => s.user);

  const handleFileSelect = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) return;

    const formData = new FormData();
    formData.append("content", content);
    formData.append("post_date", format(postDate, "yyyy-MM-dd"));
    files.forEach((file) => formData.append("attachments", file));

    try {
      await createPost(formData);
      setContent("");
      setFiles([]);
      setPostDate(new Date());
      setIsFocused(false);
    } catch {
      // エラーはストアで処理
    }
  };

  const isImageFile = (file: File) => file.type.startsWith("image/");

  return (
    <Card className="mb-6 rounded-xl shadow-sm">
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <UserAvatar
            shainName={user?.shainName ?? ""}
            avatar={user?.avatar}
            size="md"
          />

          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="チームと考えをシェアしましょう..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              rows={isFocused ? 4 : 2}
              className="resize-none transition-all"
            />

            {/* 添付ファイルプレビュー */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="relative flex items-center gap-1 bg-[hsl(var(--muted))] px-2 py-1 rounded text-sm"
                  >
                    {isImageFile(file) ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-12 w-12 object-cover rounded"
                      />
                    ) : (
                      <span className="truncate max-w-[150px]">
                        {file.name}
                      </span>
                    )}
                    <button
                      onClick={() => removeFile(i)}
                      className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 日付選択カレンダー */}
            {showCalendar && (
              <div className="border border-[hsl(var(--border))] rounded-lg p-2 w-fit">
                <Calendar
                  selected={postDate}
                  onSelect={(date) => {
                    setPostDate(date);
                    setShowCalendar(false);
                  }}
                />
              </div>
            )}

            {/* アクションバー */}
            {(isFocused || content || files.length > 0) && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleFileSelect("image/*")}
                    title="画像"
                    type="button"
                  >
                    <ImageIcon className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleFileSelect("video/*")}
                    title="動画"
                    type="button"
                  >
                    <Video className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleFileSelect("*/*")}
                    title="ファイル"
                    type="button"
                  >
                    <Paperclip className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="text-[hsl(var(--muted-foreground))] text-xs gap-1"
                    type="button"
                  >
                    <CalendarDays className="h-4 w-4" />
                    投稿日: {format(postDate, "MM/dd")}
                  </Button>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={
                    isCreating || (!content.trim() && files.length === 0)
                  }
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  投稿
                </Button>
              </div>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={handleFilesChange}
        />
      </CardContent>
    </Card>
  );
}
