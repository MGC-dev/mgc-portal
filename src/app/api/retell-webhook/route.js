// app/api/retell-webhook/route.ts

let accessTokenCache = process.env.ZOHO_ACCESS_TOKEN;

// Refresh Zoho Access Token if expired
async function refreshZohoToken() {
  const response = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
    }),
  });

  const data = await response.json();

  if (data.access_token) {
    console.log("✅ Refreshed Zoho Access Token");
    accessTokenCache = data.access_token;
    return data.access_token;
  }

  console.error("❌ Failed to refresh Zoho token:", data);
  return null;
}

// Push new lead to Zoho CRM
async function createZohoLead(retellData: any) {
  const token = accessTokenCache || (await refreshZohoToken());
  if (!token) throw new Error("Zoho access token unavailable");

  const response = await fetch("https://www.zohoapis.com/crm/v2/Leads", {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [
        {
          Last_Name: retellData.client_name || "Unknown",
          Company: "Retell Integration",
          Description: retellData.summary || JSON.stringify(retellData),
          Email: retellData.email || "",
          Phone: retellData.phone || "",
        },
      ],
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error("❌ Zoho CRM error:", result);
  } else {
    console.log("✅ Lead added in Zoho CRM");
  }
}

// Handle POST webhook requests from Retell
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("📩 Retell webhook received:", body);

    // Some Retell accounts send directly without event key
    const { event, data } = body || {};
    const payload = data || body;

    // Create a lead in Zoho CRM for each webhook call
    await createZohoLead(payload);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
