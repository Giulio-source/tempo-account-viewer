import { useState, useMemo } from "react";
import { Download, Filter, RotateCcw } from "lucide-react";
import { useTempoAccounts } from "./hooks/useTempoAccounts";
import { Skeleton } from "./components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { Button } from "./components/ui/button";
import { AccountsTable } from "./components/AccountsTable";
import {
  AVAILABLE_STATUSES,
  getStatusBadgeStyle,
  getUsageColors,
} from "./lib/utils";

function App() {
  const { accounts, loading, error } = useTempoAccounts();

  // Filter dropdown state
  const [isOpen, setIsOpen] = useState(false);
  const [appliedStatuses, setAppliedStatuses] =
    useState<string[]>(AVAILABLE_STATUSES);
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

  // 1. Globally filter accounts by applied status selection
  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter((account) => {
      const status = (account.status || "OPEN").toUpperCase();
      return appliedStatuses.includes(status);
    });
  }, [accounts, appliedStatuses]);

  // 2. Group filtered accounts by customer (customers with 0 matching accounts are omitted)
  const groupedAccounts = useMemo(() => {
    if (!filteredAccounts.length) return {};

    return filteredAccounts.reduce(
      (acc, account) => {
        const customerName =
          account.customer?.name || "Unassigned / No Customer";
        if (!acc[customerName]) {
          acc[customerName] = [];
        }
        acc[customerName].push(account);
        return acc;
      },
      {} as Record<string, typeof accounts>,
    );
  }, [filteredAccounts]);

  // Global CSV Export Logic
  const handleDownloadGlobalCsv = () => {
    if (filteredAccounts.length === 0) return;

    const headers = [
      "Customer Name",
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

    const csvRows = filteredAccounts.map((account) => {
      const customerName = account.customer?.name || "Unassigned / No Customer";
      const est = account.estimatedHours || 0;
      const logged = account.totalLoggedHours || 0;
      const rate = account.hourlyRate || 0;
      const days = est / 8;
      const remaining = est - logged;
      const rawPercent = est > 0 ? (logged / est) * 100 : 0;
      const status = account.status || "OPEN";

      return [
        `"${customerName.replace(/"/g, '""')}"`,
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

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `all_tempo_accounts_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isFiltered = appliedStatuses.length < AVAILABLE_STATUSES.length;

  if (error) {
    return (
      <div className="p-8 text-red-500">
        <h2 className="text-xl font-semibold">Error Loading Accounts</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Top Header & Global Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tempo Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">
            Overview of customer time allocations and billed hours
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadGlobalCsv}
            disabled={filteredAccounts.length === 0}
            className="h-9 bg-white"
          >
            <Download className="mr-2 h-4 w-4 text-slate-500" />
            Export All CSV
          </Button>
          <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-dashed bg-white"
              >
                <Filter className="mr-2 h-4 w-4 text-slate-500" />
                Global Status
                {isFiltered && (
                  <span className="ml-2 rounded-sm bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800">
                    {appliedStatuses.length} selected
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-white p-2 shadow-lg"
            >
              <DropdownMenuLabel className="text-xs font-semibold px-2">
                Filter All Customers
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
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeStyle(
                        status,
                      )}`}
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
              className="h-9 px-2 text-xs text-slate-500"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset Filter
            </Button>
          )}
        </div>
      </div>

      {/* Accordion Content Area */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-md" />
          ))}
        </div>
      ) : Object.keys(groupedAccounts).length === 0 ? (
        <div className="text-center py-12 border rounded-md text-muted-foreground bg-white">
          No accounts found matching the selected status filter.
        </div>
      ) : (
        <Accordion type="multiple" className="w-full space-y-4">
          {Object.entries(groupedAccounts).map(
            ([customerName, customerAccounts]) => {
              const totalLogged = customerAccounts.reduce(
                (sum, acc) => sum + (acc.totalLoggedHours || 0),
                0,
              );
              const totalEstimated = customerAccounts.reduce(
                (sum, acc) => sum + (acc.estimatedHours || 0),
                0,
              );

              const customerPercent =
                totalEstimated > 0 ? (totalLogged / totalEstimated) * 100 : 0;
              const customerColors = getUsageColors(customerPercent);

              return (
                <AccordionItem
                  key={customerName}
                  value={customerName}
                  className="border rounded-md px-4 shadow-sm bg-white"
                >
                  <AccordionTrigger className="hover:no-underline text-lg font-medium py-4">
                    <div className="flex items-center justify-between w-full pr-4 gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-900">
                          {customerName}
                        </span>
                        <span className="text-xs font-normal text-muted-foreground bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                          {customerAccounts.length}{" "}
                          {customerAccounts.length === 1
                            ? "account"
                            : "accounts"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {totalEstimated > 0 ? (
                          <div
                            className={`flex items-center gap-2.5 border px-3 py-1 rounded-full text-xs font-medium ${customerColors.badge}`}
                          >
                            <span>
                              {totalLogged.toFixed(1)} / {totalEstimated} hrs
                            </span>
                            <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                            <span className="font-bold">
                              {customerPercent.toFixed(1)}%
                            </span>
                            <div className="w-12 h-1.5 bg-black/10 rounded-full overflow-hidden ml-1">
                              <div
                                className={`h-full rounded-full ${customerColors.bar}`}
                                style={{
                                  width: `${Math.min(customerPercent, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                            Total: {totalLogged.toFixed(1)} hrs
                          </span>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <AccountsTable accounts={customerAccounts} />
                  </AccordionContent>
                </AccordionItem>
              );
            },
          )}
        </Accordion>
      )}
    </div>
  );
}

export default App;
