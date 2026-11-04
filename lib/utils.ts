import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fmtDay = (iso: string, pattern = "EEE, d MMM yyyy") => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return format(new Date(y, m - 1, d), pattern);
};
export const fmtDateTime = (iso: string) => format(new Date(iso), "d MMM yyyy, HH:mm");
export const ago = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true });
export const minutesLabel = (m: number | null | undefined) => {
  if (m === null || m === undefined) return "-";
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  return h ? `${h}h ${mm}m` : `${mm}m`;
};
/** Value for <input type="datetime-local"> in local time. */
export const toLocalInput = (iso: string | null) => (iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : "");
export const titleCase = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
export const parseTags = (s: string) => [...new Set(s.split(",").map((t) => t.trim()).filter(Boolean))];
