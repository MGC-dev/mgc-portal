// src/app/api/zoho-callback/route.ts
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return new Response("❌ Missing authorization code", { status: 400 });
    }

    console.log("🔑 Received Zoho auth code:", code);

    const response = await fetch("https://accounts.zoho.com/oauth/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.ZOHO_CLIENT_ID!,
        client_secret: process.env.ZOHO_CLIENT_SECRET!,
        redirect_uri: process.env.ZOHO_REDIRECT_URI!,
        code,
      }),
    });

    const data = await response.json();
    console.log("🔐 Token exchange result:", data);

    if (data.error) {
      return new Response(JSON.stringify({ error: data }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify(
        {
          message: "✅ Zoho token exchange successful",
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
        },
        null,
        2
      ),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Zoho callback error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
