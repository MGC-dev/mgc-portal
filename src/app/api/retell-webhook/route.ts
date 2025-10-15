import { NextRequest, NextResponse } from "next/server";

let accessToken: string | null = null;

// --- CONFIG ---
// Replace with the Zoho custom field API name you create for storing call id (recommended).
// Example: "Retell_Call_ID__c" or "Retell_Call_ID" depending on your Zoho setup.
const RETELL_CALL_FIELD_API_NAME = process.env.RETELL_CALL_FIELD_API_NAME || "Retell_Call_ID";

// Verified from-address in Zoho
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
  if (!toEmail) {
    console.warn("sendZohoEmail: no recipient, skipping");
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

// Search by custom Retell call id field (if you created it)
async function leadExistsByCallId(callId: string, token: string) {
  if (!callId) return false;
  // Use Zoho search with criteria on custom field:
  // (Retell_Call_ID:equals:call_123)
  // Make sure RETELL_CALL_FIELD_API_NAME matches the API name of your Zoho field.
  const criteria = `(${RETELL_CALL_FIELD_API_NAME}:equals:${callId})`;
  const url = `https://www.zohoapis.com/crm/v2/Leads/search?criteria=${encodeURIComponent(criteria)}`;
  const resp = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  const data = await safeJson(resp);
  return Array.isArray(data.data) && data.data.length > 0;
}

// Create lead — includes setting the Retell call id custom field (if available)
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
    Lead_Source: "Retell AI",
  };
  if (payload.email) leadObj.Email = payload.email;
  if (payload.country) leadObj.Country = payload.country;
  // attach call id to custom field if provided
  if (payload.callId) {
    leadObj[RETELL_CALL_FIELD_API_NAME] = payload.callId;
  }

  const res = await fetch("https://www.zohoapis.com/crm/v2/Leads", {
    method: "POST",
    headers: { Authorization: `Zoho-oauthtoken ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ data: [leadObj] }),
  });

  return safeJson(res);
}

// --- Enhanced extraction from Retell transcript object ---
// --- Enhanced extraction from Retell transcript object (robust/flexible) ---
function extractUserDataFromTranscriptObject(payload: any) {
  const result: any = { name: null, email: null, company: null, location: null, industry: null };

  // Try several possible transcript arrays
  const transcriptArray =
    payload?.call?.transcript_object ||
    payload?.call?.conversation ||
    payload?.call?.call_analysis?.conversation ||
    payload?.call?.call_analysis?.messages ||
    payload?.call?.analysis?.conversation ||
    [];

  if (!Array.isArray(transcriptArray) || transcriptArray.length === 0) {
    console.warn("⚠️ No transcript array found in payload");
    return result;
  }

  // Combine all agent and user messages into a single text block
  const fullText = transcriptArray
    .filter(t => typeof t.content === "string")
    .map(t => t.content)
    .join(" ")
    .toLowerCase();

  // --- Flexible patterns per field ---
  const patterns = {
    name: [
      /name[:\-]?\s*([a-z\s]+)/i,
      /your name is\s+([a-z\s]+)/i,
      /name is\s+([a-z\s]+)/i,
      /this is\s+([a-z\s]+)/i
    ],
    email: [
      /email[:\-]?\s*([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i,
      /email is\s*([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i
    ],
    company: [
      /company[:\-]?\s*([a-z0-9 &]+)/i,
      /company name is\s*([a-z0-9 &]+)/i,
      /organization is\s*([a-z0-9 &]+)/i,
      /business is\s*([a-z0-9 &]+)/i
    ],
    location: [
      /location[:\-]?\s*([a-z, ]+)/i,
      /located in\s*([a-z, ]+)/i,
      /based in\s*([a-z, ]+)/i
    ],
    industry: [
      /industry[:\-]?\s*([a-z0-9 &]+)/i,
      /sector is\s*([a-z0-9 &]+)/i
    ]
  };

  // Function to match patterns
  function matchPatterns(arr: RegExp[]) {
    for (const p of arr) {
      const m = fullText.match(p);
      if (m) return m[1].trim();
    }
    return null;
  }

  result.name = matchPatterns(patterns.name);
  result.email = matchPatterns(patterns.email);
  result.company = matchPatterns(patterns.company);
  result.location = matchPatterns(patterns.location);
  result.industry = matchPatterns(patterns.industry);

  // --- Fallback: scan user lines if missing ---
  for (const entry of transcriptArray) {
    const role = entry.role?.toLowerCase?.() || "";
    const text = (entry.content || "").toLowerCase();
    if (role === "user") {
      if (!result.name) {
        const nm = text.match(/(?:my name is|i am|this is)\s+([a-z\s]+)/i);
        if (nm) result.name = nm[1].trim();
      }
      if (!result.email) {
        const em = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
        if (em) result.email = em[0].toLowerCase();
      }
      if (!result.company) {
        const cm = text.match(/(?:company|organization|business)\s+(?:is|called)\s+([a-z0-9 &]+)/i);
        if (cm) result.company = cm[1].trim();
      }
      if (!result.location) {
        const lm = text.match(/(?:located|based)\s+(?:in|at)\s+([a-z0-9, ]+)/i);
        if (lm) result.location = lm[1].trim();
      }
      if (!result.industry) {
        const im = text.match(/(?:industry|sector)\s+(?:is|in)\s+([a-z0-9 &]+)/i);
        if (im) result.industry = im[1].trim();
      }
    }
  }

  return result;
}




// Fallback extraction from transcript (extend patterns if needed)
function extractFromTranscript(transcript = "") {
  const t = transcript || "";
  const nameMatch = t.match(/(?:my name is|I'm|I am|this is)\s+([A-Za-z][A-Za-z'’\-\s]{1,80})/i);
  const emailMatch = t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const companyMatch = t.match(/(?:company|organization|business)\s+(?:is|called)\s+([A-Za-z0-9 &]+)/i);
  const locationMatch = t.match(/(?:located|based)\s+(?:in|at)\s+([A-Za-z0-9, ]+)/i);
  const industryMatch = t.match(/(?:industry|sector)\s+(?:is|in)\s+([A-Za-z &]+)/i);

  return {
    userName: nameMatch?.[1]?.trim() || null,
    userEmail: emailMatch?.[0]?.toLowerCase() || null,
    company: companyMatch?.[1]?.trim() || null,
    location: locationMatch?.[1]?.trim() || null,
    industry: industryMatch?.[1]?.trim() || null,
  };
}

// --- Main webhook handler ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    console.log("Incoming Retell payload:", JSON.stringify(body));

    // If the payload is empty at all — skip
    if (!body || Object.keys(body).length === 0) {
      console.log("Empty payload - skipping");
      return NextResponse.json({ success: true, message: "Empty payload ignored" });
    }

    // Normalize: try a few common places Retell may put content
    // callId: body.call_id || body.call?.call_id || body.call?.id
    const callId = body.call_id || body.call?.call_id || body.call?.id || body.call?.id;
    const event = body.event || body.status || null;

    // prefer transcript from top-level / body.call.transcript / body.transcript
    const transcript =
      (typeof body.transcript === "string" && body.transcript) ||
      body.call?.transcript ||
      (body.call && body.call.transcripts ? body.call.transcripts.join("\n") : "") ||
      "";

          // If structured transcript_object exists, extract user-focused data
    const structuredData = extractUserDataFromTranscriptObject(body);


    // Try extracted variables in several likely locations
    const variables =
      body.variables ||
      body.metadata?.variables ||
      body.data?.variables ||
      body.call?.call_analysis?.variables ||
      body.call?.analysis?.variables ||
      {};

    // We only want to process final/analyzed events (avoid call_started)
    // If Retell sends only call_completed/call_analyzed event, you may check event === 'call_analyzed' or 'call_completed'
    // But to be safe, if variables/transcript exist we proceed; else skip.
    const hasData = Object.keys(variables || {}).length > 0 || transcript.trim().length > 0;

    if (!hasData) {
      console.log("No transcript/variables in payload - skipping");
      return NextResponse.json({ success: true, message: "No content to process" });
    }

    // Build candidate fields from variables first, fallback to transcript extraction
    // let userName = variables.user_name || variables.userName || variables.name || null;
    // let userEmail = variables.user_email || variables.userEmail || variables.email || null;
    // let company = variables.company_name || variables.company || null;
    // let industry = variables.industry || null;
    // let location = variables.location || variables.city || null;

   let userName = structuredData?.name || variables.user_name || variables.name || null;
    let userEmail = structuredData?.email || variables.user_email || variables.email || null;
    let company = structuredData?.company || variables.company_name || variables.company || null;
    let location = structuredData?.location || variables.city || null;
    let industry = structuredData?.industry || variables.industry || null;

    if (!userName || !userEmail) {
      const extracted = extractFromTranscript(transcript);
      userName = userName || extracted.userName || "Unknown";
      userEmail = userEmail || extracted.userEmail || null;
      company = company || extracted.company || null;
      industry = industry || extracted.industry || null;
      location = location || extracted.location || null;
    }
    console.log("Extracted data:", structuredData);
    // Refresh token
    const token = accessToken || (await refreshZohoToken());
    if (!token) {
      console.error("No Zoho token available");
      return NextResponse.json({ error: "No Zoho token" }, { status: 500 });
    }

    // --- Idempotency checks ---
    // 1) If callId present and a lead with that call id exists, skip.
    if (callId) {
      const existsByCall = await leadExistsByCallId(callId, token);
      if (existsByCall) {
        console.log("Lead already exists for callId:", callId, " — skipping creation");
        // still optionally send email to admin if needed
        return NextResponse.json({ success: true, message: "Already processed (call id)" });
      }
    }

    // 2) If email exists and lead exists by email, skip creating new lead (but update could be done)
    if (userEmail) {
      const existsByEmail = await leadExistsByEmail(userEmail, token);
      if (existsByEmail) {
        console.log("Lead already exists for email:", userEmail, " — skipping creation");
      } else {
        // create lead and attach callId (if available)
        const description = `Industry: ${industry || ""}\nLocation: ${location || ""}\n\nTranscript:\n${transcript}`;
        if (!callId && !userEmail) {
          console.warn("Skipping lead creation: no callId or email.");
          return NextResponse.json({ success: true, message: "Skipped (no unique key)" });
        }

        const leadResp = await createLead(
          {
            lastName: userName || "Unknown",
            company,
            email: userEmail,
            description,
            country: location,
            callId,
          },
          token
        );
        console.log("Lead create response:", JSON.stringify(leadResp));
      }
    } else {
      // No email provided — still attempt to dedupe using callId (already checked above).
      if (!callId) {
        // We have neither email nor callId — do not create duplicate leads for safety.
        console.warn("No email and no callId — skipping lead creation to avoid duplicates.");
      } else {
        // create lead tied to callId
        const description = `Industry: ${industry || ""}\nLocation: ${location || ""}\n\nTranscript:\n${transcript}`;
        const leadResp = await createLead(
          {
            lastName: userName || "Unknown",
            company,
            email: null,
            description,
            country: location,
            callId,
          },
          token
        );
        console.log("Lead create response (callId only):", JSON.stringify(leadResp));
      }
    }

    // Send summary email to admin and (optionally) to user if email present
    const adminEmail = process.env.NOTIFY_EMAIL || "aksuba7@gmail.com";
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
    // admin
    await sendZohoEmail(adminEmail, `Retell Call ${callId || ""} Summary`, summaryHtml).catch((e) =>
      console.error("Error sending admin email:", e)
    );
    // user (optional)
    if (userEmail) {
      await sendZohoEmail(userEmail, "Thanks — we received your intake", summaryHtml).catch((e) =>
        console.error("Error sending user email:", e)
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
