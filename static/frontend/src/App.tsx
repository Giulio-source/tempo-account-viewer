import { useState, useMemo, useEffect } from "react";
import {
  Download,
  RotateCcw,
  Save,
  Check,
  Key,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useTempoAccounts } from "./hooks/useTempoAccounts";
import { Skeleton } from "./components/ui/skeleton";
import { Accordion } from "./components/ui/accordion";
import { Button } from "./components/ui/button";

import { StatusFilterDropdown } from "./components/StatusFilterDropdown";
import { CustomerFilterDropdown } from "./components/CustomerFilterDropdown";
import { CustomerAccordionItem } from "./components/CustomerAccordionItem";
import {
  AVAILABLE_STATUSES,
  exportAccountsToCsv,
  STORAGE_KEY,
} from "./lib/utils";
import { invoke, router, view } from "@forge/bridge";

function App() {
  const { accounts, loading, error } = useTempoAccounts();

  const [appliedStatuses, setAppliedStatuses] =
    useState<string[]>(AVAILABLE_STATUSES);
  const [appliedCustomers, setAppliedCustomers] = useState<string[]>([]);

  const [isSaved, setIsSaved] = useState(false);
  const [hasLoadedSavedFilters, setHasLoadedSavedFilters] = useState(false);

  // Automated OAuth Flow State
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Extract list of all unique customer names
  const allCustomers = useMemo(() => {
    if (!accounts) return [];
    const set = new Set<string>();
    accounts.forEach((acc) => {
      set.add(acc.customer?.name || "Unassigned / No Customer");
    });
    return Array.from(set).sort();
  }, [accounts]);

  // Load initial filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.statuses)) setAppliedStatuses(parsed.statuses);
        if (Array.isArray(parsed.customers))
          setAppliedCustomers(parsed.customers);
      } catch (err) {
        console.error("Failed to parse saved filters:", err);
      }
    }
    setHasLoadedSavedFilters(true);
  }, []);

  // Default customers filter to all if no saved state exists
  useEffect(() => {
    if (allCustomers.length > 0 && hasLoadedSavedFilters) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) setAppliedCustomers(allCustomers);
    }
  }, [allCustomers, hasLoadedSavedFilters]);

  // Save/Reset state actions
  const handleSaveFilters = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        statuses: appliedStatuses,
        customers: appliedCustomers,
      }),
    );
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleResetFilters = () => {
    setAppliedStatuses(AVAILABLE_STATUSES);
    setAppliedCustomers(allCustomers);
    localStorage.removeItem(STORAGE_KEY);
  };

  // 1-Click Automated OAuth Trigger
  const handleStartOAuth = async () => {
    setIsAuthorizing(true);
    setAuthError(null);

    try {
      const { clientId, redirectUri } = (await invoke(
        "getTempoAuthUrl",
      )) as any;
      const context = await view.getContext();
      const siteUrl = context.siteUrl;

      const authUrl = `https://api.tempo.io/oauth/authorize/redirect?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri || "",
      )}&response_type=code&jira_url=${encodeURIComponent(siteUrl)}`;

      await router.open(authUrl);

      // Background Polling: Checks every 2 seconds if webtrigger completed exchange
      const pollInterval = setInterval(async () => {
        try {
          await invoke("getTempoAccounts");
          clearInterval(pollInterval);
          window.location.reload(); // Instantly refresh app view on success!
        } catch (e) {
          // Token not saved yet, keep waiting...
        }
      }, 2000);

      // Stop polling after 3 minutes if prompt was closed or abandoned
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsAuthorizing(false);
      }, 180000);
    } catch (err: any) {
      console.error("Failed to launch authorization window:", err);
      setAuthError("Failed to launch authorization window.");
      setIsAuthorizing(false);
    }
  };

  const isStatusFiltered = appliedStatuses.length < AVAILABLE_STATUSES.length;
  const isCustomerFiltered =
    allCustomers.length > 0 && appliedCustomers.length < allCustomers.length;
  const isFiltered = isStatusFiltered || isCustomerFiltered;

  // Filter accounts globally
  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter((account) => {
      const status = (account.status || "OPEN").toUpperCase();
      const customerName = account.customer?.name || "Unassigned / No Customer";
      return (
        appliedStatuses.includes(status) &&
        (appliedCustomers.length === 0 ||
          appliedCustomers.includes(customerName))
      );
    });
  }, [accounts, appliedStatuses, appliedCustomers]);

  // Group accounts by customer (sorted alphabetically by customer name)
  const groupedAccounts = useMemo(() => {
    if (!filteredAccounts.length) return {};

    const grouped = filteredAccounts.reduce(
      (acc, account) => {
        const customerName =
          account.customer?.name || "Unassigned / No Customer";
        if (!acc[customerName]) acc[customerName] = [];
        acc[customerName].push(account);
        return acc;
      },
      {} as Record<string, typeof accounts>,
    );

    return Object.fromEntries(
      Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)),
    );
  }, [filteredAccounts]);

  // Intercept missing auth state
  const isAuthError =
    error &&
    (error.includes("NO_TEMPO_TOKENS") || error.includes("REFRESH_FAILED"));

  if (isAuthError) {
    return (
      <div className="p-8 max-w-[500px] mx-auto space-y-6">
        <div className="bg-white border rounded-lg p-8 shadow-sm space-y-6 text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
              <Key className="h-8 w-8" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Connect Tempo Account
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Authorize access to view customer time allocations and billed
              hours.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              onClick={handleStartOAuth}
              disabled={isAuthorizing}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-medium"
            >
              {isAuthorizing ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Waiting for authorization...
                </>
              ) : (
                <>
                  <ExternalLink className="h-5 w-5" />
                  Connect Tempo Account
                </>
              )}
            </Button>

            {isAuthorizing && (
              <p className="text-xs text-slate-500 animate-pulse">
                Complete authorization in the opened window. This page will
                update automatically.
              </p>
            )}
          </div>

          {authError && (
            <p className="text-sm text-red-600 bg-red-50 p-2.5 rounded-md border border-red-200">
              {authError}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Handle generic errors
  if (error) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto text-red-700">
        <h2 className="text-xl font-semibold">Error Loading Accounts</h2>
        <p className="mt-1 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tempo Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">
            Overview of customer time allocations and billed hours
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <StatusFilterDropdown
            appliedStatuses={appliedStatuses}
            onApply={setAppliedStatuses}
          />

          <CustomerFilterDropdown
            allCustomers={allCustomers}
            appliedCustomers={appliedCustomers}
            onApply={setAppliedCustomers}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveFilters}
            className={`h-9 transition-colors ${
              isSaved
                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                : "bg-white"
            }`}
          >
            {isSaved ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4 text-slate-500" />
                Save Filters
              </>
            )}
          </Button>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 px-2 text-xs text-slate-500"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}

          <Button
            variant="default"
            size="sm"
            onClick={() =>
              exportAccountsToCsv(filteredAccounts, "all_tempo_accounts.csv")
            }
            disabled={filteredAccounts.length === 0}
            className="h-9"
          >
            <Download className="h-4 w-4 text-white" />
            Export All CSV
          </Button>
        </div>
      </div>

      {/* Main Accordion View */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      ) : Object.keys(groupedAccounts).length === 0 ? (
        <div className="text-center py-12 border rounded-md text-muted-foreground bg-white">
          No accounts found matching the selected filters.
        </div>
      ) : (
        <Accordion type="multiple" className="w-full space-y-4">
          {Object.entries(groupedAccounts).map(
            ([customerName, customerAccounts]) => (
              <CustomerAccordionItem
                key={customerName}
                customerName={customerName}
                customerAccounts={customerAccounts}
              />
            ),
          )}
        </Accordion>
      )}
      {/* 
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white p-3 rounded-lg shadow-xl flex gap-2 text-xs z-50">
          <button
            onClick={async () => {
              const data = await invoke("debugStorage");
              console.log("Storage Data:", data);
              alert(JSON.stringify(data, null, 2));
            }}
            className="bg-slate-700 hover:bg-slate-600 px-2.5 py-1 rounded"
          >
            🔍 Inspect Storage
          </button>
          <button
            onClick={async () => {
              await invoke("clearStorage");
              window.location.reload();
            }}
            className="bg-red-600 hover:bg-red-500 px-2.5 py-1 rounded font-bold"
          >
            🧹 Wipe Storage & Test Auth
          </button>
        </div>
       */}
    </div>
  );
}

export default App;
