import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });

  try {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      redirect_uri: process.env.ZOHO_REDIRECT_URI!,
      code,
    });

    const response = await fetch("https://accounts.zoho.com/oauth/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await response.json();
    console.log("🔑 Zoho Token Response:", data);

    if (data.error) {
      return NextResponse.json({ error: data }, { status: 400 });
    }

    // Save these tokens in Vercel ENV manually
    return NextResponse.json({
      message: "✅ Zoho token exchange successful",
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    });
  } catch (err: any) {
    console.error("❌ Zoho callback error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
