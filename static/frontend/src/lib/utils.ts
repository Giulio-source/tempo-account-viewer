import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { TempoAccount } from "../hooks/useTempoAccounts";

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

export const AVAILABLE_STATUSES = ["OPEN", "CLOSED", "ARCHIVED"];

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

export const STORAGE_KEY = "tempo_accounts_app_filters_v1";

export const exportAccountsToCsv = (
  accounts: TempoAccount[],
  filename: string = "tempo_accounts_report.csv",
  includeCustomerColumn: boolean = true,
) => {
  if (accounts.length === 0) return;

  const headers = [
    ...(includeCustomerColumn ? ["Customer Name"] : []),
    "Account Key",
    "Account Name",
    "Total Hours",
    "Basket Days",
    "Rate ($/hr)",
    "Billed Hours",
    "Used Time %",
    "Remaining Hours",
    "Status",
  ];

  const csvRows = accounts.map((account) => {
    const customerName = account.customer?.name || "Unassigned / No Customer";
    const est = account.estimatedHours || 0;
    const logged = account.totalLoggedHours || 0;
    const rate = account.hourlyRate || 0;
    const days = est / 8;
    const remaining = est - logged;
    const rawPercent = est > 0 ? (logged / est) * 100 : 0;
    const status = account.status || "OPEN";

    const row = [
      ...(includeCustomerColumn
        ? [`"${customerName.replace(/"/g, '""')}"`]
        : []),
      `"${(account.key || "").replace(/"/g, '""')}"`,
      `"${(account.name || "").replace(/"/g, '""')}"`,
      est > 0 ? est : 0,
      days > 0 ? days.toFixed(2) : 0,
      rate > 0 ? rate : 0,
      logged.toFixed(2),
      `${rawPercent.toFixed(2)}%`,
      est > 0 ? remaining.toFixed(1) : 0,
      `"${status}"`,
    ];

    return row.join(",");
  });

  const csvString = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
