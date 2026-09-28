import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getUsageColors = (percent: number) => {
  if (percent >= 100) {
    return {
      bar: "bg-red-600",
      text: "text-red-600",
      badge: "bg-red-50 text-red-700 border-red-200",
    };
  }
  if (percent >= 80) {
    return {
      bar: "bg-amber-500",
      text: "text-amber-600",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }
  return {
    bar: "bg-emerald-500",
    text: "text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
};

export const AVAILABLE_STATUSES = ["OPEN", "CLOSED"];

export const getStatusBadgeStyle = (status: string) => {
  const normalized = status.toUpperCase();
  switch (normalized) {
    case "OPEN":
      return "bg-green-100 text-green-800 border-green-200";
    case "CLOSED":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "ARCHIVED":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
};
