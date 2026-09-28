import Resolver from "@forge/resolver";
import { fetch } from "@forge/api";

const resolver = new Resolver();

resolver.define("getTempoAccounts", async () => {
  // @ts-ignore
  const tempoToken = process.env.TEMPO_API_TOKEN;

  if (!tempoToken) {
    throw new Error("Tempo API token is not configured.");
  }

  const headers = {
    Authorization: `Bearer ${tempoToken}`,
    Accept: "application/json",
  };

  const accountsResponse = await fetch("https://api.tempo.io/4/accounts", {
    headers,
  });
  if (!accountsResponse.ok) {
    throw new Error(`Tempo API Error: ${accountsResponse.status}`);
  }

  const accountsData = await accountsResponse.json();
  const accounts = accountsData.results || accountsData;

  const accountsWithDetails = await Promise.all(
    accounts.map(async (account: any) => {
      let estimatedHours = 0;
      let hourlyRate = 0;
      let cleanName = account.name;

      const prefixMatch = account.name.match(/^\[(.*?)\]/);
      if (prefixMatch) {
        const content = prefixMatch[1].toUpperCase();

        const hMatch = content.match(/H(\d+(?:\.\d+)?)/);
        if (hMatch) estimatedHours = parseFloat(hMatch[1]);

        const rMatch = content.match(/R(\d+(?:\.\d+)?)/);
        if (rMatch) hourlyRate = parseFloat(rMatch[1]);

        // Clean the name for better UI display
        cleanName = account.name.replace(/^\[.*?\]\s*/, "");
      }

      // 2. Fetch Worklogs
      let totalLoggedHours = 0;
      try {
        const worklogRes = await fetch(
          `https://api.tempo.io/4/worklogs/account/${account.key}`,
          { headers },
        );

        if (worklogRes.ok) {
          const worklogData = await worklogRes.json();
          const worklogs = worklogData.results || [];
          const totalSeconds = worklogs.reduce(
            (acc: number, wl: { timeSpentSeconds?: number }) =>
              acc + (wl.timeSpentSeconds || 0),
            0,
          );
          totalLoggedHours = Math.round((totalSeconds / 3600) * 100) / 100;
        }
      } catch (err) {
        console.error(`Failed to fetch worklogs for ${account.key}`);
      }

      return {
        ...account,
        cleanName,
        estimatedHours,
        hourlyRate,
        totalLoggedHours,
      };
    }),
  );

  return accountsWithDetails;
});

export const handler = resolver.getDefinitions();
