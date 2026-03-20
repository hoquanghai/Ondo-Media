"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  className?: string;
  onClickFullscreen?: () => void;
}

export function VideoPlayer({ src, className = "", onClickFullscreen }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<"landscape" | "portrait" | "square">("landscape");
  const [videoReady, setVideoReady] = useState(false);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  // Detect aspect ratio when metadata loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onMetadata = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w && h) {
        const ratio = w / h;
        if (ratio > 1.2) setAspectRatio("landscape");      // 16:9, etc
        else if (ratio < 0.8) setAspectRatio("portrait");   // 9:16
        else setAspectRatio("square");                       // ~1:1
      }
      setDuration(video.duration);
      setVideoReady(true);
    };

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress(video.duration ? (video.currentTime / video.duration) * 100 : 0);
    };

    const onEnded = () => setIsPlaying(false);

    video.addEventListener("loadedmetadata", onMetadata);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);

    // If metadata already loaded
    if (video.readyState >= 1) onMetadata();

    return () => {
      video.removeEventListener("loadedmetadata", onMetadata);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  // Auto-play muted when in viewport
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
          setIsPlaying(true);
        } else {
          video.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const showControlsTemp = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      setShowControls(true);
    } else {
      video.play().catch(() => {});
      setIsPlaying(true);
      showControlsTemp();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Container height based on aspect ratio
  const containerStyle: React.CSSProperties = {
    ...(aspectRatio === "portrait"
      ? { maxHeight: "600px", aspectRatio: "9/16" }
      : aspectRatio === "square"
        ? { maxHeight: "500px", aspectRatio: "1/1" }
        : { maxHeight: "500px", aspectRatio: "16/9" }),
    width: "100%",
    margin: "0 auto",
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}
      style={aspectRatio === "portrait" ? { display: "flex", justifyContent: "center", backgroundColor: "#111" } : {}}
      onMouseEnter={showControlsTemp}
      onMouseMove={showControlsTemp}
      onClick={togglePlay}
    >
      <div style={containerStyle} className="relative">
        <video
          ref={videoRef}
          src={src}
          className={`w-full h-full ${aspectRatio === "portrait" ? "object-contain" : "object-cover"}`}
          muted={isMuted}
          playsInline
          preload="auto"
          poster=""
        />

        {/* Loading / poster placeholder */}
        {!videoReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="animate-spin h-8 w-8 border-2 border-white/30 border-t-white rounded-full" />
          </div>
        )}

        {/* Big play button when paused */}
        {!isPlaying && videoReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/50 rounded-full p-4 hover:bg-black/70 transition-colors backdrop-blur-sm">
              <Play className="h-10 w-10 text-white fill-white" />
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 transition-opacity duration-300 ${
            showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress bar */}
          <div
            className="w-full h-1 bg-white/30 rounded-full cursor-pointer mb-2 group"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-white rounded-full relative transition-all"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="text-white hover:text-gray-200">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
              </button>
              <span className="text-white text-xs tabular-nums">
                {fmt(currentTime)} / {fmt(duration)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-white hover:text-gray-200">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              {onClickFullscreen && (
                <button
                  onClick={(e) => { e.stopPropagation(); onClickFullscreen(); }}
                  className="text-white hover:text-gray-200"
                >
                  <Maximize className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
