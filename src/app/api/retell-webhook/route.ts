// app/api/retell-webhook/route.ts
import { NextRequest } from "next/server";

// In-memory cache for Zoho token
let cachedToken: string | null = null;
let tokenExpiry: number | null = null; // timestamp in ms

// Get Zoho Access Token (auto-refresh)
async function getZohoToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken;
  }

  const res = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
    }),
  });

  const data = await res.json();

  if (!data.access_token) {
    console.error("❌ Failed to refresh Zoho token:", data);
    throw new Error("Zoho token refresh failed");
  }

  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in - 60) * 1000;
  return data.access_token; // return the actual string
}

// Push new lead to Zoho CRM
async function createZohoLead(payload: any) {
  const token = await getZohoToken();
  const userTranscript = payload.call.transcript || "";
  const leadData = {
    Last_Name: userTranscript ? userTranscript.split(".")[0].trim() : "Unknown",
    Company: payload.call.agent_name || "Retell Automation",
    Description: payload.call.call_analysis?.call_summary || userTranscript,
    Email: "", // Retell doesn’t send email here
    Phone: "", // Retell doesn’t send phone here
  };

  const response = await fetch("https://www.zohoapis.com/crm/v2/Leads", {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: [leadData], trigger: ["workflow"] }),
  });

  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch (e) {
    result = text;
  }

  if (!response.ok) {
    console.error("❌ Zoho CRM error:", result);
    throw new Error("Zoho CRM lead creation failed");
  } else {
    console.log("✅ Lead added to Zoho CRM:", result);
  }

  return result;
}

// GET handler — for testing in browser
export async function GET() {
  return new Response(
    "Retell webhook endpoint is running. Send POST requests to trigger Zoho.",
    { status: 200, headers: { "Content-Type": "text/plain" } }
  );
}

// POST handler — Retell webhook
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📩 RETELL WEBHOOK RECEIVED at", new Date().toISOString());
    console.log("Full payload:", JSON.stringify(body, null, 2));

    const payload = (body as any).data || body;

    const zohoResult = await createZohoLead(payload);

    return new Response(JSON.stringify({ success: true, zoho: zohoResult }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("❌ Webhook processing error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", detail: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
