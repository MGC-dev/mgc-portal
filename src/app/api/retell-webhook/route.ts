import { NextRequest, NextResponse } from "next/server";

let accessToken: string | null = null;

// --- CONFIG ---
const RETELL_CALL_FIELD_API_NAME = process.env.RETELL_CALL_FIELD_API_NAME || "Retell_Call_ID";
const ZOHO_FROM_EMAIL = process.env.ZOHO_FROM_EMAIL || "mgcentral@mgconsultingfirm.com";

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

async function sendZohoEmail(toEmail: string | null, subject: string, message: string) {
  if (!toEmail) return;
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
          from: { email: ZOHO_FROM_EMAIL },
          to: [{ email: toEmail }],
          subject,
          content: message,
        },
      ],
    }),
  });

  return safeJson(res);
}

async function leadExistsByEmail(email: string, token: string) {
  if (!email) return false;
  const resp = await fetch(`https://www.zohoapis.com/crm/v2/Leads/search?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  const data = await safeJson(resp);
  return Array.isArray(data.data) && data.data.length > 0;
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

// --- Extract final user data starting from bottom of transcript ---
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

    if (!body || Object.keys(body).length === 0) return NextResponse.json({ success: true, message: "Empty payload ignored" });

    const event = body.event || body.status || null;

    // Only process after conversation ends
    if (!["call_completed", "call_analyzed"].includes(event)) {
      console.log(`Event "${event}" ignored - only processing after conversation ends.`);
      return NextResponse.json({ success: true, message: `Event "${event}" ignored` });
    }

    const callId = body.call_id || body.call?.call_id || body.call?.id;

    // Get transcript array
    const transcriptArray: TranscriptEntry[] =
      body.call?.transcript_object ||
      body.call?.conversation ||
      body.call?.call_analysis?.conversation ||
      body.call?.call_analysis?.messages ||
      [];

    // Extract final details from bottom of transcript
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

    // Idempotency checks
    if (callId && (await leadExistsByCallId(callId, token))) {
      return NextResponse.json({ success: true, message: "Already processed (call id)" });
    }

    if (!userEmail && !callId) {
      console.warn("No email or callId - skipping lead creation.");
      return NextResponse.json({ success: true, message: "Skipped (no unique key)" });
    }

    // Create lead
    const description = `Industry: ${industry || ""}\nLocation: ${location || ""}\n\nTranscript:\n${transcript}`;
    const leadResp = await createLead(
      { lastName: userName, company, email: userEmail, description, country: location, callId },
      token
    );
    console.log("Lead create response:", JSON.stringify(leadResp));

    // Send summary emails
    const adminEmail = "aksuba7@gmail.com";
    const summaryHtml = `
      <h3>Retell Call Summary</h3>
      <p><b>Call ID:</b> ${callId || "N/A"}</p>
      <p><b>Name:</b> ${userName}</p>
      <p><b>Email:</b> ${userEmail || "N/A"}</p>
      <p><b>Company:</b> ${company || "N/A"}</p>
      <p><b>Industry:</b> ${industry || "N/A"}</p>
      <p><b>Location:</b> ${location || "N/A"}</p>
      <p><b>Agent:</b> ${body.call?.agent_name || "N/A"}</p>
      <p><b>Duration:</b> ${body.call?.duration_seconds || "N/A"} seconds</p>
      <hr />
      <pre>${transcript}</pre>
    `;
   // After lead creation
        try {
          await sendZohoEmail(adminEmail, `Retell Call ${callId || ""} Summary`, summaryHtml);
        } catch (err) {
          console.error("Admin email failed:", err);
        }

        if (userEmail) {
          try {
            await sendZohoEmail(userEmail, "Thanks — we received your intake", summaryHtml);
          } catch (err) {
            console.error("User email failed:", err);
          }
        } else {
          console.warn("No user email found - cannot send email to user.");
        }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
