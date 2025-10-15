import { NextRequest, NextResponse } from "next/server";

let accessToken: string | null = null;

/* 🔄 Refresh Zoho Token */
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
  else console.error("❌ Failed to refresh token", data);

  return accessToken;
}

/* 📧 Send Email via Zoho Mail */
async function sendZohoEmail(toEmail: string | null, subject: string, message: string) {
  if (!toEmail) return;

  const token = accessToken || (await refreshZohoToken());
  const res = await fetch("https://www.zohoapis.com/crm/v2/Emails", {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [
        {
          from: { email: "mgcentral@mgconsultingfirm.com" },
          to: [{ email: toEmail }],
          subject,
          content: message,
        },
      ],
    }),
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("⚠️ Invalid Zoho response:", text);
    return { error: "Invalid JSON", raw: text };
  }
}

/* 🔍 Check if lead already exists */
async function leadExists(email: string, token: string) {
  if (!email) return false;
  const resp = await fetch(`https://www.zohoapis.com/crm/v2/Leads/search?email=${email}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  const data = await resp.json();
  return data.data?.length > 0;
}

/* 🧠 Extract details from transcript */
function extractFromTranscript(transcript: string) {
  const nameMatch = transcript.match(/(?:my name is|I’m|this is)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i);
  const emailMatch = transcript.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const companyMatch = transcript.match(/(?:company|organization|business)\s+(?:is|called)\s+([A-Za-z0-9 &]+)/i);
  const industryMatch = transcript.match(/(?:industry|sector)\s+(?:is|in)\s+([A-Za-z]+)/i);
  const locationMatch = transcript.match(/(?:located|based)\s+(?:in)\s+([A-Za-z, ]+)/i);

  return {
    user_name: nameMatch?.[1]?.trim() || "Unknown",
    user_email: emailMatch?.[0]?.toLowerCase() || null,
    company_name: companyMatch?.[1]?.trim() || "",
    industry: industryMatch?.[1]?.trim() || "",
    location: locationMatch?.[1]?.trim() || "",
  };
}

/* 🚀 Main Webhook Handler */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ✅ Normalize payload (Retell structure)
    const metadata = body.metadata || {};
    const vars = metadata.variables || {};
    const transcript = body.transcript || body.call?.transcript || "";

    // Extract from variables (Retell dynamic variables)
    let userName = vars.user_name || null;
    let userEmail = vars.user_email || null;
    let company = vars.company_name || null;
    let industry = vars.industry || null;
    let location = vars.location || null;

    // Fallback to regex-based extraction
    if (!userEmail || !userName) {
      const extracted = extractFromTranscript(transcript);
      userName ||= extracted.user_name;
      userEmail ||= extracted.user_email;
      company ||= extracted.company_name;
      industry ||= extracted.industry;
      location ||= extracted.location;
    }

    // 🪪 Refresh token
    const token = accessToken || (await refreshZohoToken());
    if (!token) return NextResponse.json({ error: "No Zoho token" }, { status: 500 });

    // 🔁 Avoid duplicate lead
    if (userEmail && (await leadExists(userEmail, token))) {
      console.log(`ℹ️ Lead already exists: ${userEmail}`);
    } else {
      const leadRes = await fetch("https://www.zohoapis.com/crm/v2/Leads", {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: [
            {
              Last_Name: userName || "Unknown",
              Company: company || "Retell Lead",
              Email: userEmail || "",
              Lead_Source: "Retell AI",
              Description: `Industry: ${industry}\nLocation: ${location}\n\nFull Transcript:\n${transcript}`,
              Country: location || "",
            },
          ],
        }),
      });

      const data = await leadRes.json();
      console.log("✅ Lead created:", data);
    }

    // 📧 Send summary email
    const summary = `
      <h3>🗒 Retell AI Conversation Summary</h3>
      <p><b>Name:</b> ${userName}</p>
      <p><b>Email:</b> ${userEmail}</p>
      <p><b>Company:</b> ${company}</p>
      <p><b>Industry:</b> ${industry}</p>
      <p><b>Location:</b> ${location}</p>
      <hr />
      <p><b>Full Transcript:</b></p>
      <pre>${transcript}</pre>
    `;

    await sendZohoEmail(userEmail, "Retell AI Conversation Summary", summary);

    return NextResponse.json({ success: true, message: "Lead created & email sent" });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
