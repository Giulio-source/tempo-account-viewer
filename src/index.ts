import { fetch } from "@forge/api";
import kvs from "@forge/kvs";
import Resolver from "@forge/resolver";

const TEMPO_TOKEN_ENDPOINT = "https://api.tempo.io/oauth/token/";
const resolver = new Resolver();

interface TempoTokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

async function getValidTempoToken(): Promise<string> {
  const tokenData = (await kvs.getSecret("TEMPO_OAUTH_DATA")) as
    | TempoTokenData
    | undefined;

  if (!tokenData || !tokenData.refreshToken) {
    throw new Error("NO_TEMPO_TOKENS");
  }

  // Refresh 5 minutes before actual expiration
  const bufferMs = 5 * 60 * 1000;
  const isExpired = Date.now() + bufferMs >= tokenData.expiresAt;

  if (!isExpired && tokenData.accessToken) {
    return tokenData.accessToken;
  }

  const clientId = process.env.TEMPO_CLIENT_ID;
  const clientSecret = process.env.TEMPO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("MISSING_OAUTH_CREDENTIALS");
  }

  const response = await fetch(TEMPO_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokenData.refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`REFRESH_FAILED_${response.status}`);
  }

  const newTokens = await response.json();

  const updatedTokenData: TempoTokenData = {
    accessToken: newTokens.access_token,
    refreshToken: newTokens.refresh_token || tokenData.refreshToken,
    expiresAt: Date.now() + newTokens.expires_in * 1000,
  };

  await kvs.setSecret("TEMPO_OAUTH_DATA", updatedTokenData);
  return updatedTokenData.accessToken;
}

export async function tempoCallback(request: any) {
  try {
    // Extract 'code' from query parameters (e.g. ?code=XYZ)
    const code = request.queryParameters?.code?.[0];

    if (!code) {
      return {
        body: "<html><body><h2>Authorization Failed</h2><p>No authorization code received.</p></body></html>",
        headers: { "Content-Type": ["text/html"] },
        statusCode: 400,
      };
    }

    const clientId = process.env.TEMPO_CLIENT_ID;
    const clientSecret = process.env.TEMPO_CLIENT_SECRET;
    const redirectUri = process.env.TEMPO_REDIRECT_URI;

    // Exchange code for tokens
    const response = await fetch(TEMPO_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri || "",
        code,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        body: `<html><body><h2>Token Exchange Failed</h2><p>${errText}</p></body></html>`,
        headers: { "Content-Type": ["text/html"] },
        statusCode: 400,
      };
    }

    const tokenInfo = await response.json();
    const tokenData: TempoTokenData = {
      accessToken: tokenInfo.access_token,
      refreshToken: tokenInfo.refresh_token,
      expiresAt: Date.now() + tokenInfo.expires_in * 1000,
    };

    // Save tokens securely in Forge storage
    await kvs.setSecret("TEMPO_OAUTH_DATA", tokenData);

    // Return HTML that automatically closes the tab
    return {
      body: `
        <html>
          <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
            <h2 style="color: #0052CC;">Tempo Authorization Successful!</h2>
            <p>You have successfully connected Tempo to Jira.</p>
            <p>This window will close automatically...</p>
            <script>
              setTimeout(() => { window.close(); }, 1500);
            </script>
          </body>
        </html>
      `,
      headers: { "Content-Type": ["text/html"] },
      statusCode: 200,
    };
  } catch (err: any) {
    return {
      body: `<html><body><h2>Error</h2><p>${err.message}</p></body></html>`,
      headers: { "Content-Type": ["text/html"] },
      statusCode: 500,
    };
  }
}

resolver.define("getTempoAuthUrl", async () => {
  return {
    clientId: process.env.TEMPO_CLIENT_ID,
    redirectUri: process.env.TEMPO_REDIRECT_URI,
  };
});

resolver.define("getTempoAccounts", async () => {
  const token = await getValidTempoToken();

  const accountsResponse = await fetch(
    "https://api.tempo.io/4/accounts/search?limit=1000",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        statuses: ["OPEN", "CLOSED", "ARCHIVED"],
      }),
    },
  );

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

      const prefixMatch = account.name?.match(/^\[(.*?)\]/);
      if (prefixMatch) {
        const content = prefixMatch[1].toUpperCase();

        const hMatch = content.match(/H(\d+(?:\.\d+)?)/);
        if (hMatch) estimatedHours = parseFloat(hMatch[1]);

        const rMatch = content.match(/R(\d+(?:\.\d+)?)/);
        if (rMatch) hourlyRate = parseFloat(rMatch[1]);

        cleanName = account.name.replace(/^\[.*?\]\s*/, "");
      }

      let totalLoggedHours = 0;
      try {
        const worklogRes = await fetch(
          `https://api.tempo.io/4/worklogs/account/${account.key}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
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
        console.error(`Failed to fetch worklogs for ${account.key}`, err);
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

resolver.define("debugStorage", async () => {
  const oauthData = await kvs.getSecret("TEMPO_OAUTH_DATA");
  console.log(
    "📦 [DEBUG STORAGE] TEMPO_OAUTH_DATA:",
    JSON.stringify(oauthData, null, 2),
  );
  return oauthData || { message: "No data found" };
});

// 2. Wipe stored secret/data
resolver.define("clearStorage", async () => {
  await kvs.deleteSecret("TEMPO_OAUTH_DATA");
  console.log(
    "🧹 [DEBUG STORAGE] Cleared TEMPO_OAUTH_DATA from Forge storage!",
  );
  return { status: "cleared" };
});

export const handler = resolver.getDefinitions();
