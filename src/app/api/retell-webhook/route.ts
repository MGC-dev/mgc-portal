import { NextRequest, NextResponse } from "next/server";

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

// 🔹 Send Zoho Email
async function sendZohoEmail(toEmail: string, subject: string, message: string) {
  if (!toEmail) {
    console.warn("No user email provided. Skipping email send.");
    return;
  }

  const token = accessToken || (await refreshZohoToken());
  if (!token) throw new Error("Missing Zoho token");

  const response = await fetch("https://www.zohoapis.com/crm/v2/Emails", {
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

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    console.error("Failed to parse Zoho response:", text);
    data = { error: "Invalid JSON response", raw: text };
  }

  if (data?.code && data.code !== "SUCCESS") {
    console.error("Failed to send email:", data);
  } else {
    console.log("✅ Email sent successfully:", data);
  }

  return data;
}

// 🔹 Check if lead exists
async function leadExists(email: string, token: string) {
  if (!email) return false;
  const resp = await fetch(`https://www.zohoapis.com/crm/v2/Leads/search?email=${email}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  const data = await resp.json();
  return data.data?.length > 0;
}

// 🔹 Main webhook
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("💡 Incoming Retell payload:", JSON.stringify(body, null, 2));

    // Only handle 'call_analyzed' event
    if (body.event !== "call_analyzed") {
      console.log(`Skipping event: ${body.event}`);
      return NextResponse.json({ success: true, message: "Event skipped" });
    }

    const payload = body.data || {};

    // Extract variables from Retell
    const variables = payload.variables || {};
    const userName = variables.user_name || "Unknown";
    const userEmail = variables.user_email || null;
    const company = variables.company_name || "Retell Automation";
    const industry = variables.industry || "";
    const location = variables.location || "";
    const opsFocus = variables.ops_focus || "";
    const mainChallenge = variables.main_challenge || "";
    const topGoals = variables.top_goals || "";
    const pastConsultant = variables.past_consultant || "";
    const systems = variables.systems || "";
    const timeline = variables.timeline || "";
    const budget = variables.budget || "";

    const token = accessToken || (await refreshZohoToken());
    if (!token) return NextResponse.json({ error: "No Zoho token" }, { status: 500 });

    // Avoid duplicate leads
    if (userEmail && (await leadExists(userEmail, token))) {
      console.log("Lead already exists for email:", userEmail);
    } else {
      // Create lead
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
              Description: `Industry: ${industry}\nLocation: ${location}\nOps Focus: ${opsFocus}\nMain Challenge: ${mainChallenge}\nTop Goals: ${topGoals}\nPast Consultant: ${pastConsultant}\nSystems: ${systems}\nTimeline: ${timeline}\nBudget: ${budget}`,
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

    // Send email if user_email exists
    const emailContent = `
      <h3>Retell Conversation Summary</h3>
      <p><strong>Name:</strong> ${userName}</p>
      <p><strong>Email:</strong> ${userEmail || "N/A"}</p>
      <p><strong>Company:</strong> ${company}</p>
      <p><strong>Industry:</strong> ${industry}</p>
      <p><strong>Location:</strong> ${location}</p>
      <p><strong>Ops Focus:</strong> ${opsFocus}</p>
      <p><strong>Main Challenge:</strong> ${mainChallenge}</p>
      <p><strong>Top Goals:</strong> ${topGoals}</p>
      <p><strong>Past Consultant:</strong> ${pastConsultant}</p>
      <p><strong>Systems:</strong> ${systems}</p>
      <p><strong>Timeline:</strong> ${timeline}</p>
      <p><strong>Budget:</strong> ${budget}</p>
    `;

    await sendZohoEmail(userEmail, "Retell Conversation Completed", emailContent);

    return NextResponse.json({ success: true, message: "Lead added and email sent" });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
