import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

/**
 * Tailwind CSS クラス結合ユーティリティ
 * clsx + tailwind-merge でクラス名を安全にマージする
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 日付フォーマット
 * @param date - Date オブジェクトまたは ISO 文字列
 * @param formatStr - フォーマット文字列 (date-fns 形式)
 */
export function formatDate(
  date: Date | string,
  formatStr: string = "yyyy年M月d日",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, formatStr, { locale: ja });
}

/**
 * 相対時刻フォーマット (例: "3分前", "2時間前")
 * @param date - Date オブジェクトまたは ISO 文字列
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: ja });
}
