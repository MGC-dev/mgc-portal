import { NextRequest, NextResponse } from "next/server";

let accessToken: string | null = null;

// Refresh Zoho token
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

// Send email via Zoho Mail API (with retry)
async function sendZohoEmail(toEmail: string, subject: string, message: string) {
  const send = async (token: string) => {
    const response = await fetch("https://www.zohoapis.com/crm/v2/Emails", {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [
          {
            from: { email: "sduria@mgconsultingfirm.com" },
            to: [{ email: toEmail }],
            subject,
            content: message,
          },
        ],
      }),
    });

    const data = await response.json();
    return { status: response.status, data };
  };

  let token = accessToken || (await refreshZohoToken());
  if (!token) throw new Error("Missing Zoho token");

  let result = await send(token);

  if (
    result.status === 401 ||
    (result.data?.code === "NO_PERMISSION" && result.data?.message?.includes("permission"))
  ) {
    console.warn("Token expired or permission denied, refreshing token and retrying...");
    token = await refreshZohoToken();
    if (!token) throw new Error("Failed to refresh Zoho token");
    result = await send(token);
  }

  if (result.data?.code && result.data?.code !== "SUCCESS") {
    console.error("Failed to send email:", result.data);
    throw new Error(result.data?.message || "Zoho email API error");
  }

  console.log("Email sent successfully:", result.data);
  return result.data;
}

// Extract structured details from transcript
function extractDetails(transcript: string) {
  const nameMatch = transcript.match(/(?:my name is|i am|this is)\s+([A-Za-z ]+)/i);
  const emailMatch = transcript.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  const countryMatch = transcript.match(/country\s*[:\-]?\s*([A-Za-z ]+)/i);
  const businessMatch = transcript.match(/business(?: is| name)?\s*[:\-]?\s*([A-Za-z0-9 &]+)/i);

  return {
    name: nameMatch ? nameMatch[1].trim() : "Unknown",
    email: emailMatch ? emailMatch[0].trim() : null,
    country: countryMatch ? countryMatch[1].trim() : null,
    business: businessMatch ? businessMatch[1].trim() : null,
  };
}

// Check if lead exists by email
async function leadExists(email: string, token: string) {
  if (!email) return false;
  const resp = await fetch(`https://www.zohoapis.com/crm/v2/Leads/search?email=${email}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  const data = await resp.json();
  return data.data?.length > 0;
}

// Main webhook
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = body.data || body;

    const transcript = payload.call?.transcript || "";
    const summary = payload.call?.call_analysis?.call_summary || transcript;
    const details = extractDetails(transcript);

    const token = accessToken || (await refreshZohoToken());
    if (!token) return NextResponse.json({ error: "No Zoho token" }, { status: 500 });

    // Avoid duplicate leads
    if (details.email && (await leadExists(details.email, token))) {
      console.log("Lead already exists for email:", details.email);
    } else {
      // Create Lead
      const leadResp = await fetch("https://www.zohoapis.com/crm/v2/Leads", {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: [
            {
              Last_Name: details.name,
              Company: details.business || "Retell Automation",
              Description: summary,
              Lead_Source: "Retell AI",
              Email: details.email,
              Country: details.country,
            },
          ],
        }),
      });

      const leadData = await leadResp.json();
      console.log("✅ Lead created:", leadData);
    }

    // Send transcript email
    const emailContent = `
      <h3>Retell Conversation Summary</h3>
      <p><strong>Lead Name:</strong> ${details.name}</p>
      <p><strong>Email:</strong> ${details.email || "N/A"}</p>
      <p><strong>Country:</strong> ${details.country || "N/A"}</p>
      <p><strong>Business:</strong> ${details.business || "N/A"}</p>
      <p><strong>Summary:</strong> ${summary}</p>
      <pre style="background:#f9f9f9;padding:10px;">${transcript}</pre>
    `;

    await sendZohoEmail("aksuba7@gmail.com", "Retell Conversation Completed", emailContent);

    return NextResponse.json({ success: true, message: "Lead added and email sent" });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
