"use client";

import { useState, useEffect } from "react";

/**
 * メディアクエリフック
 * @param query - CSS メディアクエリ文字列
 * @returns クエリにマッチしているかどうか
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

/** モバイル判定 (< 768px) */
export const useIsMobile = () => useMediaQuery("(max-width: 767px)");

/** タブレット判定 (768px - 1279px) */
export const useIsTablet = () =>
  useMediaQuery("(min-width: 768px) and (max-width: 1279px)");

/** デスクトップ判定 (>= 1280px) */
export const useIsDesktop = () => useMediaQuery("(min-width: 1280px)");
