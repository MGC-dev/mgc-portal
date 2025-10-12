// app/api/retell-webhook/route.ts
import { NextRequest } from "next/server";

let accessTokenCache = process.env.ZOHO_ACCESS_TOKEN;

// Refresh Zoho Access Token if expired
async function refreshZohoToken(): Promise<string | null> {
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

// GET handler — for testing in browser
export async function GET() {
  return new Response("Retell webhook endpoint is running. Send POST requests to trigger Zoho.", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

// POST handler — Retell webhook


export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📩 RETELL WEBHOOK RECEIVED at", new Date().toISOString());
    console.log("Full payload:", JSON.stringify(body, null, 2));

    const payload = (body as any).data || body;

    // Try to create Zoho lead and capture response
    const token = accessTokenCache || (await refreshZohoToken());
    if (!token) {
      console.error("No Zoho token available");
      return new Response(JSON.stringify({ error: "No Zoho token" }), { status: 500 });
    }

    const zohoResp = await fetch("https://www.zohoapis.com/crm/v2/Leads", {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [
          {
            Last_Name: payload.client_name || payload.name || "Unknown",
            Company: payload.company || "Retell Automation",
            Description: payload.summary || JSON.stringify(payload),
            Email: payload.email || "",
            Phone: payload.phone || "",
          },
        ],
      }),
    });

    const zohoText = await zohoResp.text();
    let zohoJson;
    try { zohoJson = JSON.parse(zohoText); } catch(e) { zohoJson = zohoText; }

    console.log("Zoho response status:", zohoResp.status);
    console.log("Zoho response body:", zohoJson);

    if (!zohoResp.ok) {
      return new Response(JSON.stringify({ error: "Zoho error", detail: zohoJson }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, zoho: zohoJson }), { status: 200 });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
