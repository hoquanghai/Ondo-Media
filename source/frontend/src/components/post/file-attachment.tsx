"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PostFile } from "@/types/post";

interface FileAttachmentProps {
  file: PostFile;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(mimeType: string): "image" | "video" | "file" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "file";
}

export function FileAttachment({ file }: FileAttachmentProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const fileType = getFileType(file.mimeType);

  if (fileType === "image") {
    return (
      <>
        <button
          onClick={() => setShowLightbox(true)}
          className="block w-full"
        >
          <img
            src={file.fileUrl}
            alt={file.fileName}
            className="rounded-lg max-h-96 object-cover w-full cursor-pointer hover:opacity-90 transition-opacity"
            loading="lazy"
          />
        </button>

        <Dialog open={showLightbox} onOpenChange={setShowLightbox}>
          <DialogContent className="max-w-4xl p-2">
            <DialogTitle className="sr-only">{file.fileName}</DialogTitle>
            <img
              src={file.fileUrl}
              alt={file.fileName}
              className="w-full h-auto rounded"
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (fileType === "video") {
    return (
      <video
        src={file.fileUrl}
        controls
        className="rounded-lg max-h-96 w-full"
        preload="metadata"
      />
    );
  }

  // File download link
  return (
    <a
      href={file.fileUrl}
      download={file.fileName}
      className="flex items-center gap-2 p-3 bg-[hsl(var(--muted))] rounded-lg hover:bg-[hsl(var(--muted))]/80 transition-colors"
    >
      <FileDown className="h-5 w-5 text-[hsl(var(--primary))]" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.fileName}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {formatFileSize(file.fileSize)}
        </p>
      </div>
    </a>
  );
}
