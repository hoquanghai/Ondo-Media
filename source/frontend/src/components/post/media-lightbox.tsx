"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";
import type { PostFile } from "@/types/post";

interface MediaLightboxProps {
  files: PostFile[];
  initialIndex: number;
  onClose: () => void;
}

export function MediaLightbox({
  files,
  initialIndex,
  onClose,
}: MediaLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [mounted, setMounted] = useState(false);

  const currentFile = files[currentIndex];
  const isVideo = currentFile?.fileType === "video" || currentFile?.mimeType?.startsWith("video/");
  const total = files.length;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : prev));
  }, [total]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goPrev();
          break;
        case "ArrowRight":
          goNext();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev]);

  if (!mounted || !currentFile) return null;

  const lightbox = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90"
        onClick={onClose}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors"
        aria-label="閉じる"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Counter */}
      {total > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white/80 text-sm font-medium bg-black/40 px-3 py-1.5 rounded-full">
          {currentIndex + 1} / {total}
        </div>
      )}

      {/* Previous button */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-4 z-10 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors"
          aria-label="前へ"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {/* Next button */}
      {currentIndex < total - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-4 z-10 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors"
          aria-label="次へ"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Media content */}
      <div
        className="relative z-[1] flex items-center justify-center max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            key={currentFile.id}
            src={currentFile.fileUrl}
            controls
            autoPlay
            playsInline
            className="max-w-[90vw] max-h-[85vh] rounded-lg bg-black"
            style={{ minWidth: "300px", minHeight: "200px" }}
          />
        ) : (
          <img
            key={currentFile.id}
            src={currentFile.fileUrl}
            alt={currentFile.fileName}
            className="max-w-full max-h-[90vh] object-contain rounded select-none"
            draggable={false}
          />
        )}
      </div>

      {/* File name */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-white/60 text-xs bg-black/40 px-3 py-1 rounded-full max-w-[80vw] truncate">
        {currentFile.fileName}
      </div>
    </div>
  );

  return createPortal(lightbox, document.body);
}
