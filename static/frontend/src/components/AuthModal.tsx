import { Key, ExternalLink, RefreshCw } from "lucide-react";

import { invoke, router, view } from "@forge/bridge";
import { useState } from "react";
import { Button } from "./ui/button";

export const AuthModal = () => {
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

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
            Authorize access to view customer time allocations and billed hours.
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
              Complete authorization in the opened window. This page will update
              automatically.
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
};
