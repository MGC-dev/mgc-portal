import { NextRequest } from "next/server";

// Simple in-memory cache for access token
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

// 1️⃣ Get Zoho Bigin Access Token
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
  return data.access_token;
}

// 2️⃣ Create or Update Contact in Bigin
async function createOrUpdateContact(token: string, contactData: any) {
  const searchRes = await fetch(
    `https://www.zohoapis.com/bigin/v2/Contacts/search?email=${contactData.Email}`,
    {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    }
  );

  const searchData = await searchRes.json();

  if (searchData.data && searchData.data.length > 0) {
    console.log("🔄 Contact already exists:", searchData.data[0].id);
    return searchData.data[0].id;
  }

  const res = await fetch("https://www.zohoapis.com/bigin/v2/Contacts", {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: [contactData] }),
  });

  const result = await res.json();
  console.log("✅ Contact created:", result);
  return result.data[0].details.id;
}

// 3️⃣ Create or Update Company
async function createOrUpdateCompany(token: string, companyName: string) {
  if (!companyName) return null;

  const searchRes = await fetch(
    `https://www.zohoapis.com/bigin/v2/Accounts/search?criteria=(Account_Name:equals:${companyName})`,
    {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    }
  );

  const searchData = await searchRes.json();

  if (searchData.data && searchData.data.length > 0) {
    console.log("🔄 Company exists:", searchData.data[0].id);
    return searchData.data[0].id;
  }

  const res = await fetch("https://www.zohoapis.com/bigin/v2/Accounts", {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [{ Account_Name: companyName }],
    }),
  });

  const result = await res.json();
  console.log("✅ Company created:", result);
  return result.data[0].details.id;
}

// 4️⃣ Create Deal (linked to contact & company)
async function createDeal(token: string, dealData: any) {
  const res = await fetch("https://www.zohoapis.com/bigin/v2/Deals", {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: [dealData], trigger: ["workflow"] }),
  });

  const result = await res.json();
  console.log("✅ Deal created:", result);
  return result;
}

// 5️⃣ Main Webhook Handler
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📩 Retell webhook received:", JSON.stringify(body, null, 2));

    const payload = (body as any).data || body;
    const token = await getZohoToken();

    // Extract info from conversation
    const transcript = payload.call?.transcript || "";
    const dynamic = payload.call?.collected_dynamic_variables || {};

    const nameMatch =
      transcript.match(/My name is (\w+)/i) ||
      transcript.match(/This is (\w+)/i) ||
      transcript.match(/I am (\w+)/i);
    const name = nameMatch ? nameMatch[1] : "Unknown";

    const companyName =
      dynamic.company ||
      (transcript.match(/from (.*?)(?:\.|$)/i)?.[1] ?? "");

    const contactId = await createOrUpdateContact(token, {
      Last_Name: name,
      Email: dynamic.email || "",
      Phone: dynamic.phone || "",
    });

    const companyId = await createOrUpdateCompany(token, companyName);

    const dealData = {
      Deal_Name: `Conversation with ${name}`,
      Stage: "New",
      Amount: 0,
      Contact_Name: contactId,
      Account_Name: companyId,
      Description: payload.call.call_analysis?.call_summary || transcript,
    };

    const dealResult = await createDeal(token, dealData);

    return new Response(
      JSON.stringify({ success: true, deal: dealResult }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("❌ Error in Retell webhook:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
