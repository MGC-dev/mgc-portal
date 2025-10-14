import { NextRequest } from "next/server";

let accessToken: string | null = null;

// 🔁 Refresh Zoho token
async function refreshZohoToken() {
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
  if (data.access_token) accessToken = data.access_token;
  else console.error("Failed to refresh token", data);
  return accessToken;
}

// ✉️ Send email via Zoho Mail API
async function sendZohoEmail(toEmail: string, subject: string, message: string) {
  const token = accessToken || (await refreshZohoToken());
  if (!token) throw new Error("Missing Zoho token");

  const emailData = {
    fromAddress: "yourname@yourdomain.com", // Your verified Zoho Mail
    toAddress: [toEmail],
    subject,
    content: message,
    mailFormat: "html",
  };

  const res = await fetch("https://mail.zoho.com/api/accounts/<your-account-id>/messages", {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailData),
  });

  const data = await res.json();
  console.log("Email sent response:", data);
  return data;
}

// 🧠 Extract name from transcript
function extractName(transcript: string) {
  const match = transcript?.match(/(?:my name is|this is|i am)\s+([A-Za-z ]+)/i);
  return match ? match[1].trim() : "Unknown";
}

// 📩 Main webhook
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = body.data || body;

    const transcript = payload.call.transcript || "";
    const summary = payload.call.call_analysis?.call_summary || transcript;
    const userName = extractName(transcript);

    const token = accessToken || (await refreshZohoToken());
    if (!token) return Response.json({ error: "No Zoho token" }, { status: 500 });

    // 🧾 Create Lead in Zoho CRM
    const leadResp = await fetch("https://www.zohoapis.com/crm/v2/Leads", {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [
          {
            Last_Name: userName,
            Company: "Retell Automation",
            Description: summary,
            Lead_Source: "Retell AI",
          },
        ],
      }),
    });

    const leadData = await leadResp.json();
    console.log("✅ Lead created:", leadData);

    // 📤 Send transcript email
    const emailContent = `
      <h3>Retell Conversation Summary</h3>
      <p><strong>Lead Name:</strong> ${userName}</p>
      <p><strong>Summary:</strong> ${summary}</p>
      <pre style="background:#f9f9f9;padding:10px;">${transcript}</pre>
    `;

    await sendZohoEmail("aksuba7@gmail.com", "Retell Conversation Completed", emailContent);

    return Response.json({ success: true, message: "Lead added and email sent" });
  } catch (err) {
    console.error("Webhook error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
