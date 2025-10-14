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

// Send email via Zoho Mail API
async function sendZohoEmail(toEmail: string | null, subject: string, message: string) {
  if (!toEmail) {
    console.warn("No user email provided. Skipping email send.");
    return;
  }

  const token = accessToken || (await refreshZohoToken());
  if (!token) throw new Error("Missing Zoho token");

  const res = await fetch("https://www.zohoapis.com/crm/v2/Emails", {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [
        {
          from: { email: "mgcentral@mgconsultingfirm.com" }, // verified Zoho email
          to: [{ email: toEmail }],
          subject,
          content: message,
        },
      ],
    }),
  });

  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (err) {
    console.error("Failed to parse Zoho response:", text);
    return { error: "Invalid JSON response", raw: text };
  }
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

// Extract variables from transcript
function extractFromTranscript(transcript: string) {
  const userNameMatch = transcript.match(/my name is ([A-Za-z ]+)/i);
  const emailMatch = transcript.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const locationMatch = transcript.match(/located in ([A-Za-z, ]+)/i);
  const companyMatch = transcript.match(/company is ([A-Za-z0-9 &]+)/i);
  const industryMatch = transcript.match(/industry is ([A-Za-z]+)/i);

  return {
    userName: userNameMatch ? userNameMatch[1].trim() : "Unknown",
    userEmail: emailMatch ? emailMatch[0] : null,
    company: companyMatch ? companyMatch[1].trim() : "Retell Automation",
    industry: industryMatch ? industryMatch[1].trim() : "",
    location: locationMatch ? locationMatch[1].trim() : "",
  };
}

// Main webhook
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = body.data || body;

    // Try variables first, fallback to transcript
    let userName = payload.user_name;
    let userEmail = payload.user_email;
    let company = payload.company_name;
    let industry = payload.industry;
    let location = payload.location;

    if (!userName || !userEmail) {
      const transcript = payload.call?.transcript || "";
      const extracted = extractFromTranscript(transcript);
      userName = userName || extracted.userName;
      userEmail = userEmail || extracted.userEmail;
      company = company || extracted.company;
      industry = industry || extracted.industry;
      location = location || extracted.location;
    }

    const token = accessToken || (await refreshZohoToken());
    if (!token) return NextResponse.json({ error: "No Zoho token" }, { status: 500 });

    // Avoid duplicate leads
    if (userEmail && (await leadExists(userEmail, token))) {
      console.log("Lead already exists for email:", userEmail);
    } else {
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
              Company: company,
              Description: `Industry: ${industry}\nLocation: ${location}`,
              Lead_Source: "Retell AI",
              Email: userEmail,
              Country: location,
            },
          ],
        }),
      });

      const leadData = await leadResp.json();
      console.log("✅ Lead created:", leadData);
    }

    // Send email
    const emailContent = `
      <h3>Retell Conversation Summary</h3>
      <p><strong>Name:</strong> ${userName}</p>
      <p><strong>Email:</strong> ${userEmail || "N/A"}</p>
      <p><strong>Company:</strong> ${company}</p>
      <p><strong>Industry:</strong> ${industry}</p>
      <p><strong>Location:</strong> ${location}</p>
    `;

    await sendZohoEmail(userEmail, "Retell Conversation Completed", emailContent);

    return NextResponse.json({ success: true, message: "Lead added and email sent" });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
