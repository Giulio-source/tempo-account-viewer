import { useState, useMemo } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Filter,
  RotateCcw,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { TempoAccount } from "../hooks/useTempoAccounts";
import {
  AVAILABLE_STATUSES,
  getStatusBadgeStyle,
  getUsageColors,
} from "../lib/utils";

interface AccountsTableProps {
  accounts: TempoAccount[];
}

type SortColumn =
  | "name"
  | "totalHours"
  | "basketDays"
  | "rate"
  | "billedHours"
  | "usedPercent"
  | "remaining"
  | "status";

type SortDirection = "asc" | "desc";

export const AccountsTable = ({ accounts }: AccountsTableProps) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Dropdown open state
  const [isOpen, setIsOpen] = useState(false);

  // Active filter state used for table calculations
  const [appliedStatuses, setAppliedStatuses] =
    useState<string[]>(AVAILABLE_STATUSES);

  // Temporary draft state modified inside the open menu
  const [draftStatuses, setDraftStatuses] =
    useState<string[]>(AVAILABLE_STATUSES);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setDraftStatuses(appliedStatuses);
    }
    setIsOpen(open);
  };

  const toggleDraftStatus = (status: string) => {
    setDraftStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  const handleApply = () => {
    setAppliedStatuses(draftStatuses);
    setIsOpen(false);
  };

  const handleReset = () => {
    setAppliedStatuses(AVAILABLE_STATUSES);
    setDraftStatuses(AVAILABLE_STATUSES);
    setIsOpen(false);
  };

  // Filter accounts based on selected statuses
  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const status = (account.status || "OPEN").toUpperCase();
      return appliedStatuses.includes(status);
    });
  }, [accounts, appliedStatuses]);

  // Sort filtered accounts
  const sortedAccounts = useMemo(() => {
    return [...filteredAccounts].sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;

      const aEst = a.estimatedHours || 0;
      const aLogged = a.totalLoggedHours || 0;
      const bEst = b.estimatedHours || 0;
      const bLogged = b.totalLoggedHours || 0;

      switch (sortColumn) {
        case "name":
          aVal = (a.name || "").toLowerCase();
          bVal = (b.name || "").toLowerCase();
          break;
        case "totalHours":
          aVal = aEst;
          bVal = bEst;
          break;
        case "basketDays":
          aVal = aEst / 8;
          bVal = bEst / 8;
          break;
        case "rate":
          aVal = a.hourlyRate || 0;
          bVal = b.hourlyRate || 0;
          break;
        case "billedHours":
          aVal = aLogged;
          bVal = bLogged;
          break;
        case "usedPercent":
          aVal = aEst > 0 ? (aLogged / aEst) * 100 : 0;
          bVal = bEst > 0 ? (bLogged / bEst) * 100 : 0;
          break;
        case "remaining":
          aVal = aEst - aLogged;
          bVal = bEst - bLogged;
          break;
        case "status":
          aVal = (a.status || "OPEN").toLowerCase();
          bVal = (b.status || "OPEN").toLowerCase();
          break;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredAccounts, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // CSV Export Logic
  const handleDownloadCsv = () => {
    if (sortedAccounts.length === 0) return;

    const headers = [
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

    const csvRows = sortedAccounts.map((account) => {
      const est = account.estimatedHours || 0;
      const logged = account.totalLoggedHours || 0;
      const rate = account.hourlyRate || 0;
      const days = est / 8;
      const remaining = est - logged;
      const rawPercent = est > 0 ? (logged / est) * 100 : 0;
      const status = account.status || "OPEN";

      return [
        `"${(account.key || "").replace(/"/g, '""')}"`,
        `"${(account.name || "").replace(/"/g, '""')}"`,
        est > 0 ? est : 0,
        days > 0 ? days : 0,
        rate > 0 ? rate : 0,
        logged,
        rawPercent,
        est > 0 ? remaining : 0,
        `"${status}"`,
      ].join(",");
    });

    const csvString = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const customerName = accounts[0]?.customer?.name || "accounts";
    const sanitizedCustomerName = customerName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${sanitizedCustomerName}_tempo_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const SortableHeader = ({
    column,
    title,
    alignRight = false,
    minWidth,
  }: {
    column: SortColumn;
    title: string;
    alignRight?: boolean;
    minWidth?: string;
  }) => {
    const isActive = sortColumn === column;

    const renderSortIcon = () => {
      if (!isActive) {
        return (
          <ArrowUpDown className="w-4 h-4 ml-1 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />
        );
      }
      return sortDirection === "asc" ? (
        <ArrowUp className="w-4 h-4 ml-1 text-slate-700" />
      ) : (
        <ArrowDown className="w-4 h-4 ml-1 text-slate-700" />
      );
    };

    return (
      <TableHead
        className={`cursor-pointer select-none group hover:bg-slate-100 transition-colors ${
          alignRight ? "text-right" : ""
        } ${minWidth || ""}`}
        onClick={() => handleSort(column)}
      >
        <div
          className={`flex items-center ${
            alignRight ? "justify-end" : "justify-start"
          }`}
        >
          <span>{title}</span>
          {renderSortIcon()}
        </div>
      </TableHead>
    );
  };

  const isFiltered = appliedStatuses.length < AVAILABLE_STATUSES.length;

  return (
    <div className="space-y-3">
      {/* Table Action Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {/* Status Multi-Select Filter */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            disabled={sortedAccounts.length === 0}
            className="h-8 bg-white"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
            Export CSV
          </Button>
          <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-dashed bg-white"
              >
                <Filter className="mr-2 h-3.5 w-3.5 text-slate-500" />
                Status
                {isFiltered && (
                  <span className="ml-1.5 rounded-sm bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800">
                    {appliedStatuses.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 bg-white p-2">
              <DropdownMenuLabel className="text-xs font-semibold px-2">
                Filter by Status
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1.5" />

              <div className="space-y-1">
                {AVAILABLE_STATUSES.map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={draftStatuses.includes(status)}
                    onCheckedChange={() => toggleDraftStatus(status)}
                    onSelect={(e) => e.preventDefault()}
                    className="cursor-pointer"
                  >
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeStyle(status)}`}
                    >
                      {status}
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </div>

              <DropdownMenuSeparator className="my-2" />

              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900"
                  onClick={() => setDraftStatuses(AVAILABLE_STATUSES)}
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-3 text-xs font-medium"
                  onClick={handleApply}
                >
                  Apply
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 px-2 text-xs text-slate-500"
            >
              <RotateCcw className="mr-1.5 h-3 w-3" />
              Reset
            </Button>
          )}
        </div>

        {/* Export CSV Button & Showing Count */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Showing {sortedAccounts.length} of {accounts.length} accounts
          </span>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <SortableHeader
                column="name"
                title="Account Name"
                minWidth="min-w-[200px]"
              />
              <SortableHeader
                column="totalHours"
                title="Total Hours"
                alignRight
              />
              <SortableHeader
                column="basketDays"
                title="Basket Days"
                alignRight
              />
              <SortableHeader column="rate" title="Rate" alignRight />
              <SortableHeader
                column="billedHours"
                title="Billed Hours"
                alignRight
              />
              <SortableHeader
                column="usedPercent"
                title="Used Time %"
                minWidth="min-w-[150px]"
              />
              <SortableHeader
                column="remaining"
                title="Remaining hrs"
                alignRight
              />
              <SortableHeader column="status" title="Status" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAccounts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center h-24 text-slate-400"
                >
                  No accounts match the selected status filter.
                </TableCell>
              </TableRow>
            ) : (
              sortedAccounts.map((account) => {
                const est = account.estimatedHours || 0;
                const logged = account.totalLoggedHours || 0;
                const rate = account.hourlyRate || 0;
                const days = est / 8;
                const remaining = est - logged;

                const rawPercent = est > 0 ? (logged / est) * 100 : 0;
                const barPercent = Math.min(rawPercent, 100);
                const colors = getUsageColors(rawPercent);
                const status = account.status || "OPEN";

                return (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      {account.name}
                    </TableCell>
                    <TableCell className="text-right">
                      {est > 0 ? est : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {days > 0 ? days.toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-600">
                      {rate > 0 ? `${rate}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {logged.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {est > 0 ? (
                        <div className="flex flex-col gap-1.5 w-full">
                          <div className="flex justify-between text-xs font-medium">
                            <span className={colors.text}>
                              {rawPercent.toFixed(2)}%
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                              style={{ width: `${barPercent}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${colors.text}`}
                    >
                      {est > 0 ? remaining.toFixed(2) : "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeStyle(
                          status,
                        )}`}
                      >
                        {status}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
