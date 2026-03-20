"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { format } from "date-fns";
import {
  ImageIcon,
  Video,
  CalendarDays,
  X,
  Loader2,
  Paperclip,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { UserAvatar } from "@/components/shared/user-avatar";
import { usePostStore } from "@/stores/post-store";
import { useAuthStore } from "@/stores/auth-store";
import { processFilesForUpload } from "@/lib/media-compress";

const emojiPicker = ["😊", "👍", "❤️", "🎉", "💡", "🚀", "👏", "💪"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
    setFiles((prev) => [...prev, ...selected].slice(0, 10));
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) return;

    try {
      // Compress images and validate videos before upload
      let uploadFiles: File[] | undefined;
      if (files.length > 0) {
        const { processedFiles, errors } = await processFilesForUpload(files);
        if (errors.length > 0) {
          alert(errors.join("\n"));
          if (processedFiles.length === 0) return;
        }
        uploadFiles = processedFiles;
      }

      await createPost({
        content: content.trim(),
        postDate: format(postDate, "yyyy-MM-dd"),
        files: uploadFiles,
      });
      setContent("");
      setFiles([]);
      setPostDate(new Date());
      setIsFocused(false);
    } catch {
      // エラーはストアで処理
    }
  };

  const insertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
  };

  // Preview URLs for image/video files
  const previews = useMemo(() => {
    return files.map((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      return {
        file,
        url: isImage || isVideo ? URL.createObjectURL(file) : null,
        isImage,
        isVideo,
      };
    });
  }, [files]);

  // Cleanup Object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      previews.forEach((p) => {
        if (p.url) URL.revokeObjectURL(p.url);
      });
    };
  }, [previews]);

  const imageAndVideoFiles = previews.filter((p) => p.isImage || p.isVideo);
  const documentFiles = previews.filter((p) => !p.isImage && !p.isVideo);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex gap-3">
        <UserAvatar
          shainName={user?.shainName ?? ""}
          avatar={user?.avatar}
          snsAvatarUrl={user?.snsAvatarUrl}
          size="lg"
        />

        <div className="flex-1 space-y-3">
          <Textarea
            placeholder="チームと考えをシェアしましょう..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            className="resize-none transition-all min-h-[100px] border-gray-200 focus:border-[#1e3a8a] focus:ring-[#1e3a8a]/20"
            rows={4}
          />

          {/* Emoji picker row */}
          <div className="flex items-center gap-1">
            {emojiPicker.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="text-lg hover:scale-110 transition-transform p-1 rounded hover:bg-gray-100"
                onClick={() => insertEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* 画像・動画プレビュー (グリッド表示) */}
          {imageAndVideoFiles.length > 0 && (
            <div className="relative rounded-lg overflow-hidden border border-gray-200">
              <div
                className={`grid gap-0.5 ${
                  imageAndVideoFiles.length === 1
                    ? "grid-cols-1"
                    : "grid-cols-2"
                }`}
                style={{ maxHeight: "300px" }}
              >
                {imageAndVideoFiles.map((preview, i) => (
                  <div
                    key={i}
                    className="relative group"
                    style={{
                      height:
                        imageAndVideoFiles.length === 1 ? "300px" : "150px",
                    }}
                  >
                    {preview.isImage ? (
                      <img
                        src={preview.url!}
                        alt={preview.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="relative w-full h-full bg-black">
                        <video
                          src={preview.url!}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black/50 rounded-full p-2">
                            <Play className="h-6 w-6 text-white fill-white" />
                          </div>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() =>
                        removeFile(files.indexOf(preview.file))
                      }
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ドキュメントファイルプレビュー */}
          {documentFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {documentFiles.map((preview, i) => (
                <div
                  key={i}
                  className="relative flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg text-sm border border-gray-200"
                >
                  <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate max-w-[180px] text-gray-700 text-xs font-medium">
                      {preview.file.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatFileSize(preview.file.size)}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      removeFile(files.indexOf(preview.file))
                    }
                    className="text-gray-400 hover:text-gray-600 ml-1 flex-shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 日付選択カレンダー */}
          {showCalendar && (
            <div className="border border-gray-200 rounded-lg p-2 w-fit bg-white shadow-lg">
              <Calendar
                selected={postDate}
                onSelect={(date) => {
                  setPostDate(date);
                  setShowCalendar(false);
                }}
              />
            </div>
          )}

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                onClick={() => handleFileSelect("image/*")}
                type="button"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">画像</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                onClick={() => handleFileSelect("video/*")}
                type="button"
              >
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">動画</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                onClick={() => handleFileSelect("*/*")}
                type="button"
              >
                <Paperclip className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">ファイル</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCalendar(!showCalendar)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-50 text-xs gap-1"
                type="button"
              >
                <CalendarDays className="h-4 w-4" />
                投稿日: {format(postDate, "MM/dd")}
              </Button>
              {files.length > 0 && (
                <span className="text-xs text-gray-400 ml-2">
                  {files.length}件のファイル
                </span>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={
                isCreating || (!content.trim() && files.length === 0)
              }
              className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white px-6"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              {isCreating ? "投稿中..." : "投稿"}
            </Button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={handleFilesChange}
      />
    </div>
  );
}
