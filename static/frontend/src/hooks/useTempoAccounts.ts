import { useEffect, useState } from "react";
import { invoke } from "@forge/bridge";

export interface TempoAccountLead {
  self: string;
  accountId: string;
}

export interface TempoAccountCustomer {
  self: string;
  key: string;
  id: number;
  name: string;
}

export interface TempoAccountLinks {
  self: string;
}

export interface TempoAccount {
  self: string;
  key: string;
  id: number;
  name: string;
  cleanName?: string;
  status: "OPEN" | "CLOSED" | string;
  global: boolean;
  lead?: TempoAccountLead | null;
  customer?: TempoAccountCustomer | null;
  totalLoggedHours: number;
  estimatedHours: number;
  hourlyRate: number;
}

export const useTempoAccounts = () => {
  const [accounts, setAccounts] = useState<TempoAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAccounts = async () => {
      try {
        setLoading(true);

        const data = (await invoke("getTempoAccounts")) as TempoAccount[];
        if (isMounted) {
          setAccounts(data);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "An error occurred while fetching accounts");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAccounts();

    return () => {
      isMounted = false; // Cleanup to prevent state updates on unmounted component
    };
  }, []);

  return { accounts, loading, error };
};
