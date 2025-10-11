import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("Webhook received from Retell AI:", body);

    const { caller_number, transcript } = body;

    // Prepare data for Zoho CRM
    const leadData = {
      data: [
        {
          Last_Name: "AI Lead",
          Company: "Retell AI Call",
          Phone: caller_number || "Unknown",
          Description: transcript || "No transcript received",
        },
      ],
    };

    // TODO: Replace this with your actual Zoho access token
    const zohoAccessToken = "YOUR_ZOHO_ACCESS_TOKEN";

    // Send data to Zoho CRM
    const response = await fetch("https://www.zohoapis.com/crm/v2/Leads", {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${zohoAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(leadData),
    });

    const result = await response.json();
    console.log("Zoho CRM API Response:", result);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "Webhook endpoint is live" });
}
