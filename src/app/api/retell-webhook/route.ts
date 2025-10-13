import { NextRequest, NextResponse } from "next/server";

// In-memory token cache
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

// 1️⃣ Get Zoho Bigin Token (with refresh)
async function getZohoToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken; // cachedToken is definitely not null here
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

  return data.access_token; // cachedToken is now guaranteed to be string
}


// 2️⃣ Create or Update Contact
async function createOrUpdateContact(token: string, contactData: any) {
  if (!contactData.Email) {
    console.warn("⚠ Email missing, cannot search contact");
    return null;
  }

  const searchRes = await fetch(
    `https://www.zohoapis.com/bigin/v2/Contacts/search?email=${contactData.Email}`,
    { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
  );
  const searchData = await searchRes.json();

  if (searchData.data && searchData.data.length > 0) return searchData.data[0].id;

  const createRes = await fetch("https://www.zohoapis.com/bigin/v2/Contacts", {
    method: "POST",
    headers: { Authorization: `Zoho-oauthtoken ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ data: [contactData] }),
  });

  const result = await createRes.json();
  return result.data?.[0]?.details?.id || null;
}

// 3️⃣ Create or Update Company
async function createOrUpdateCompany(token: string, companyName: string) {
  if (!companyName) return null;

  const searchRes = await fetch(
    `https://www.zohoapis.com/bigin/v2/Accounts/search?criteria=(Account_Name:equals:${companyName})`,
    { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
  );
  const searchData = await searchRes.json();

  if (searchData.data && searchData.data.length > 0) return searchData.data[0].id;

  const createRes = await fetch("https://www.zohoapis.com/bigin/v2/Accounts", {
    method: "POST",
    headers: { Authorization: `Zoho-oauthtoken ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ data: [{ Account_Name: companyName }] }),
  });

  const result = await createRes.json();
  return result.data?.[0]?.details?.id || null;
}

// 4️⃣ Create Deal
async function createDeal(token: string, dealData: any) {
  const res = await fetch("https://www.zohoapis.com/bigin/v2/Deals", {
    method: "POST",
    headers: { Authorization: `Zoho-oauthtoken ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ data: [dealData], trigger: ["workflow"] }),
  });
  const result = await res.json();
  return result;
}

// 5️⃣ Webhook Handler
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📩 Retell webhook received:", JSON.stringify(body, null, 2));

    const payload = (body as any).data || body;
    const token = await getZohoToken();

    const transcript = payload.call?.transcript || "";
    const dynamic = payload.call?.collected_dynamic_variables || {};

    // Extract name (fallback to "Unknown")
    const nameMatch =
      transcript.match(/My name is ([A-Za-z ]+)/i) ||
      transcript.match(/This is ([A-Za-z ]+)/i) ||
      transcript.match(/I am ([A-Za-z ]+)/i);
    const name = nameMatch ? nameMatch[1].trim() : "Unknown";

    // Extract email (from dynamic variables)
    const email = dynamic.email?.trim() || "";

    // Extract phone (from dynamic variables)
    const phone = dynamic.phone?.trim() || "";

    // Extract company (from dynamic variables or transcript)
    const companyName =
      dynamic.company?.trim() ||
      transcript.match(/from ([A-Za-z0-9 &]+)/i)?.[1] ||
      "";

    // Create or update contact only if email or phone exists
    let contactId: string | null = null;
    if (email || phone) {
      contactId = await createOrUpdateContact(token, {
        Last_Name: name,
        Email: email,
        Phone: phone,
      });
    }

    // Create or update company if a name exists
    const companyId = companyName ? await createOrUpdateCompany(token, companyName) : null;

    if (!contactId) {
      console.warn("⚠️ No contact info provided, skipping deal creation");
      return new Response(JSON.stringify({ success: false, message: "No contact info" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create deal
    const dealData = {
      Deal_Name: `Conversation with ${name}`,
      Stage: "New",
      Amount: 0,
      Contact_Name: contactId,
      Account_Name: companyId,
      Description: payload.call.call_analysis?.call_summary || transcript,
    };

    const dealResult = await createDeal(token, dealData);

    return new Response(JSON.stringify({ success: true, deal: dealResult }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("❌ Error in Retell webhook:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

