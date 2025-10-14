import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "❌ Missing authorization code" }, { status: 400 });
    }

    console.log("🔑 Received Zoho Authorization Code:", code);

    // Prepare token request
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      redirect_uri: process.env.ZOHO_REDIRECT_URI!,
      code,
    });

    // Exchange authorization code for access & refresh tokens
    const tokenResponse = await fetch("https://accounts.zoho.com/oauth/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await tokenResponse.json();
    console.log("🔐 Zoho Token Exchange Response:", data);

    // Handle error response from Zoho
    if (!tokenResponse.ok || data.error) {
      return NextResponse.json(
        {
          success: false,
          message: "Zoho token exchange failed",
          details: data,
        },
        { status: 400 }
      );
    }

    // Success response
    return NextResponse.json(
      {
        success: true,
        message: "✅ Zoho token exchange successful",
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        token_type: data.token_type,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ Zoho Callback Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error during Zoho OAuth callback",
        error: error?.message || error,
      },
      { status: 500 }
    );
  }
}
