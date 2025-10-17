import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

let accessToken: string | null = null;

// --- CONFIG ---
const RETELL_CALL_FIELD_API_NAME = process.env.RETELL_CALL_FIELD_API_NAME || "Retell_Call_ID";
const ZOHO_FROM_EMAIL = process.env.ZOHO_FROM_EMAIL || "mgcentral@mgconsultingfirm.com";
const SMTP_EMAIL = process.env.SMTP_EMAIL || "mgcentral@mgconsultingfirm.com";
const SMTP_PASS = process.env.SMTP_PASS || "9iVqknk8TcfK"; // Use Zoho Mail app password
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "aksuba7@gmail.com";

// --- Helpers ---
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

  const text = await res.text();
  try {
    const data = text ? JSON.parse(text) : {};
    if (data.access_token) accessToken = data.access_token;
    else console.error("Failed to refresh token", data);
  } catch (err) {
    console.error("Failed to parse token response:", text);
  }
  return accessToken;
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (err) {
    console.warn("safeJson: invalid JSON response:", text);
    return { raw: text };
  }
}

// --- NEW: Nodemailer Email Function ---
async function sendEmailViaSMTP(toEmail: string, subject: string, html: string) {
  if (!toEmail) return { error: "Missing recipient email" };

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.in", // or smtp.zoho.com for global
      port: 465,
      secure: true,
      auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"MG Consulting" <${SMTP_EMAIL}>`,
      to: toEmail,
      subject,
      html,
    });

    console.log("Email sent successfully:", info.messageId);
    return { success: true, info };
  } catch (error) {
    console.error("SMTP Email send error:", error);
    return { success: false, error };
  }
}

async function leadExistsByCallId(callId: string, token: string) {
  if (!callId) return false;
  const criteria = `(${RETELL_CALL_FIELD_API_NAME}:equals:${callId})`;
  const url = `https://www.zohoapis.com/crm/v2/Leads/search?criteria=${encodeURIComponent(criteria)}`;
  const resp = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  const data = await safeJson(resp);
  return Array.isArray(data.data) && data.data.length > 0;
}

async function createLead(payload: {
  lastName: string;
  company: string | null;
  email: string | null;
  description: string;
  country?: string;
  callId?: string;
}, token: string) {
  const leadObj: any = {
    Last_Name: payload.lastName || "Unknown",
    Company: payload.company || "Retell Lead",
    Description: payload.description || "",
    Lead_Source: "AI",
  };
  if (payload.email) leadObj.Email = payload.email;
  if (payload.country) leadObj.Country = payload.country;
  if (payload.callId) leadObj[RETELL_CALL_FIELD_API_NAME] = payload.callId;

  const res = await fetch("https://www.zohoapis.com/crm/v2/Leads", {
    method: "POST",
    headers: { Authorization: `Zoho-oauthtoken ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ data: [leadObj] }),
  });

  return safeJson(res);
}

// --- Extract final user data ---
type TranscriptEntry = { role?: string; content?: string };

function extractFinalDetails(transcriptArray: TranscriptEntry[]) {
  const result: any = { name: null, email: null, company: null, location: null, industry: null };
  if (!Array.isArray(transcriptArray) || transcriptArray.length === 0) return result;

  for (let i = transcriptArray.length - 1; i >= 0; i--) {
    const text = transcriptArray[i].content || "";
    if (!result.name) {
      const nm = text.match(/(?:name[:\s]*is|my name is|this is)\s*([a-zA-Z\s]+)/i);
      if (nm) result.name = nm[1].trim();
    }
    if (!result.email) {
      const em = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (em) result.email = em[1].trim().toLowerCase();
    }
    if (!result.company) {
      const cm = text.match(/(?:company|organization|business)[:\s]*(?:is|called)?\s*([a-zA-Z0-9 &]+)/i);
      if (cm) result.company = cm[1].trim();
    }
    if (!result.location) {
      const lc = text.match(/(?:location|based in|city)[:\s]*(?:is|at)?\s*([a-zA-Z0-9, ]+)/i);
      if (lc) result.location = lc[1].trim();
    }
    if (!result.industry) {
      const ind = text.match(/(?:industry|sector)[:\s]*(?:is|in)?\s*([a-zA-Z0-9 &]+)/i);
      if (ind) result.industry = ind[1].trim();
    }
    if (result.name && result.email && result.company && result.location && result.industry) break;
  }
  return result;
}

// --- Main webhook handler ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    console.log("Incoming Retell payload:", JSON.stringify(body));

    if (!body || Object.keys(body).length === 0)
      return NextResponse.json({ success: true, message: "Empty payload ignored" });

    const event = body.event || body.status || null;
    if (!["call_completed", "call_analyzed"].includes(event)) {
      console.log(`Event "${event}" ignored.`);
      return NextResponse.json({ success: true, message: `Event "${event}" ignored` });
    }

    const callId = body.call_id || body.call?.call_id || body.call?.id;
    const transcriptArray: TranscriptEntry[] =
      body.call?.transcript_object ||
      body.call?.conversation ||
      body.call?.call_analysis?.conversation ||
      body.call?.call_analysis?.messages ||
      [];

    const finalDetails = extractFinalDetails(transcriptArray);
    const transcript =
      (typeof body.transcript === "string" && body.transcript) ||
      body.call?.transcript ||
      (transcriptArray.length ? transcriptArray.map(t => t.content || "").join("\n") : "");

    const userName = finalDetails.name || "Unknown";
    const userEmail = finalDetails.email || null;
    const company = finalDetails.company || null;
    const location = finalDetails.location || null;
    const industry = finalDetails.industry || null;

    console.log("Final extracted data:", { userName, userEmail, company, location, industry });

    const token = accessToken || (await refreshZohoToken());
    if (!token) return NextResponse.json({ error: "No Zoho token" }, { status: 500 });

    if (callId && (await leadExistsByCallId(callId, token))) {
      return NextResponse.json({ success: true, message: "Already processed (call id)" });
    }

    const description = `Industry: ${industry || ""}\nLocation: ${location || ""}\n\nTranscript:\n${transcript}`;
    const leadResp = await createLead(
      { lastName: userName, company, email: userEmail, description, country: location, callId },
      token
    );

    console.log("Lead create response:", leadResp);
    console.log("Starting email send process...");

    const summaryHtml = `
      <h3>Retell Call Summary</h3>
      <p><b>Call ID:</b> ${callId || "N/A"}</p>
      <p><b>Name:</b> ${userName}</p>
      <p><b>Email:</b> ${userEmail}</p>
      <p><b>Company:</b> ${company}</p>
      <p><b>Location:</b> ${location}</p>
      <p><b>Industry:</b> ${industry}</p>
      <hr/>
      <pre>${transcript}</pre>
    `;

    // Send Admin Email
    await sendEmailViaSMTP(ADMIN_EMAIL, `Retell Call ${callId || ""} Summary`, summaryHtml);

    // Send User Email
    if (userEmail) {
      await sendEmailViaSMTP(
        userEmail,
        "Thanks — we received your intake",
        `<p>Hi ${userName},</p><p>Thank you for sharing your details. Our team will get back to you shortly.</p>`
      );
    } else {
      console.warn("No user email found - cannot send user email.");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
