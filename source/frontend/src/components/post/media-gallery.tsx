"use client";

import { useState, useCallback } from "react";
import type { PostFile } from "@/types/post";
import { MediaLightbox } from "./media-lightbox";
import { VideoPlayer } from "./video-player";

interface MediaGalleryProps {
  files: PostFile[];
}

/**
 * Facebook-style media gallery grid.
 *
 * Layout rules:
 * - 1 image:  full width
 * - 2 images: side by side
 * - 3 images: 1 large left + 2 stacked right
 * - 4 images: 2x2 grid
 * - 5+ images: 2 top + 3 bottom (last shows +N overlay)
 */
export function MediaGallery({ files }: MediaGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const isMedia = (f: PostFile) =>
    f.fileType === "image" ||
    f.fileType === "video" ||
    f.mimeType?.startsWith("image/") ||
    f.mimeType?.startsWith("video/");

  const mediaFiles = files
    .filter(isMedia)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  if (mediaFiles.length === 0) return null;

  const count = mediaFiles.length;
  const displayCount = Math.min(count, 5);
  const remaining = count - 5;

  return (
    <>
      <div className="rounded-lg overflow-hidden mt-3">
        {count === 1 && (
          <div className="grid grid-cols-1 gap-0.5">
            <MediaItem
              file={mediaFiles[0]}
              onClick={() => openLightbox(0)}
              className="w-full"
              style={{
                maxHeight: (mediaFiles[0].fileType === "video" || mediaFiles[0].mimeType?.startsWith("video/"))
                  ? "600px"
                  : "500px",
              }}
            />
          </div>
        )}

        {count === 2 && (
          <div className="grid grid-cols-2 gap-0.5" style={{ height: "350px" }}>
            <MediaItem
              file={mediaFiles[0]}
              onClick={() => openLightbox(0)}
              className="w-full h-full"
            />
            <MediaItem
              file={mediaFiles[1]}
              onClick={() => openLightbox(1)}
              className="w-full h-full"
            />
          </div>
        )}

        {count === 3 && (
          <div className="grid grid-cols-2 gap-0.5" style={{ height: "400px" }}>
            <MediaItem
              file={mediaFiles[0]}
              onClick={() => openLightbox(0)}
              className="w-full h-full row-span-2"
              style={{ gridRow: "1 / 3" }}
            />
            <MediaItem
              file={mediaFiles[1]}
              onClick={() => openLightbox(1)}
              className="w-full h-full"
            />
            <MediaItem
              file={mediaFiles[2]}
              onClick={() => openLightbox(2)}
              className="w-full h-full"
            />
          </div>
        )}

        {count === 4 && (
          <div className="grid grid-cols-2 grid-rows-2 gap-0.5" style={{ height: "400px" }}>
            {mediaFiles.slice(0, 4).map((file, i) => (
              <MediaItem
                key={file.id}
                file={file}
                onClick={() => openLightbox(i)}
                className="w-full h-full"
              />
            ))}
          </div>
        )}

        {count >= 5 && (
          <div className="gap-0.5" style={{ height: "450px", display: "grid", gridTemplateRows: "1fr 1fr", gridTemplateColumns: "1fr 1fr 1fr" }}>
            {/* Top row: 2 images spanning 1.5 cols each */}
            <div className="relative" style={{ gridRow: "1", gridColumn: "1 / 3" }}>
              <MediaItem
                file={mediaFiles[0]}
                onClick={() => openLightbox(0)}
                className="w-full h-full"
              />
            </div>
            <div className="relative" style={{ gridRow: "1", gridColumn: "3" }}>
              <MediaItem
                file={mediaFiles[1]}
                onClick={() => openLightbox(1)}
                className="w-full h-full"
              />
            </div>
            {/* Bottom row: 3 images */}
            <div className="relative" style={{ gridRow: "2", gridColumn: "1" }}>
              <MediaItem
                file={mediaFiles[2]}
                onClick={() => openLightbox(2)}
                className="w-full h-full"
              />
            </div>
            <div className="relative" style={{ gridRow: "2", gridColumn: "2" }}>
              <MediaItem
                file={mediaFiles[3]}
                onClick={() => openLightbox(3)}
                className="w-full h-full"
              />
            </div>
            <div className="relative" style={{ gridRow: "2", gridColumn: "3" }}>
              <MediaItem
                file={mediaFiles[4]}
                onClick={() => openLightbox(4)}
                className="w-full h-full"
              />
              {remaining > 0 && (
                <button
                  onClick={() => openLightbox(4)}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer transition-colors hover:bg-black/60"
                >
                  <span className="text-white text-2xl font-bold">
                    +{remaining}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <MediaLightbox
          files={mediaFiles}
          initialIndex={lightboxIndex}
          onClose={closeLightbox}
        />
      )}
    </>
  );
}

// ─── MediaItem ───

interface MediaItemProps {
  file: PostFile;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
}

function MediaItem({ file, onClick, className = "", style }: MediaItemProps) {
  const isVideo = file.fileType === "video" || file.mimeType?.startsWith("video/");

  if (isVideo) {
    return (
      <div className={`relative overflow-hidden ${className}`} style={style}>
        <VideoPlayer
          src={file.fileUrl}
          className="w-full h-full"
          onClickFullscreen={onClick}
        />
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden cursor-pointer group block ${className}`}
      style={style}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={file.fileUrl}
        alt={file.fileName}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
    </button>
  );
}
