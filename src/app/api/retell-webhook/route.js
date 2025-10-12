import { NextResponse } from "next/server";
import { createZohoLead } from "@/lib/zoho";

export async function POST(req) {
  try {
    const body = await req.json();

    // Example: extract data from Retell webhook payload
    const leadData = {
      Last_Name: body.userName || "Unknown",
      Company: body.company || "N/A",
      Email: body.email || "",
      Phone: body.phone || "",
      Description: `Retell conversation summary: ${body.summary || "No summary"}`,
    };

    const result = await createZohoLead(leadData);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
