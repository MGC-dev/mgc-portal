import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { Resend } from "resend";
import { hashCode } from "@/lib/otp-store";

export const runtime = "nodejs";

// POST /api/auth/generate-signup-link
// Body: { email: string, password: string, metadata?: Record<string, any>, emailTemplateParams?: Record<string, any> }
// Returns: { ok: boolean }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, metadata, emailTemplateParams } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();

    // Create the user without sending Supabase confirmation, we will use custom OTP
    let created: any;
    try {
      const { data, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        user_metadata: metadata || {},
        email_confirm: false,
      } as any);
      if (createError) {
        const msg = createError?.message || "Failed to create user";
        const isConnRefused = msg.includes("fetch failed") || (createError as any)?.cause?.code === "ECONNREFUSED";
        return NextResponse.json(
          { error: isConnRefused ? "Supabase API unreachable (ECONNREFUSED). Check network connectivity and NEXT_PUBLIC_SUPABASE_URL." : msg },
          { status: isConnRefused ? 503 : 400 }
        );
      }
      created = data;
    } catch (e: any) {
      const isConnRefused = e?.cause?.code === "ECONNREFUSED" || `${e?.message || ""}`.includes("fetch failed");
      const msg = isConnRefused
        ? "Supabase API unreachable (ECONNREFUSED). Check network connectivity and NEXT_PUBLIC_SUPABASE_URL."
        : e?.message || "Failed to create user";
      return NextResponse.json({ error: msg }, { status: isConnRefused ? 503 : 500 });
    }

    // Generate a 6-digit OTP code and store it server-side (Supabase table)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const { error: insertError } = await admin.from("email_otps").insert({
      email,
      code_hash: hashCode(code),
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      metadata: metadata || null,
      user_id: created?.user?.id,
    });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Send OTP email via Resend
    if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const greetingName = emailTemplateParams?.full_name || undefined;
      const html = `
        <div style="font-family: Arial, sans-serif;">
          <h2>Verify your email</h2>
          <p>${greetingName ? `Hi ${greetingName},` : "Hi,"} Thanks for registering. Please verify your email to complete your account setup.</p>
          <p>Enter this verification code in the app: <strong style="font-size:18px;letter-spacing:2px;">${code}</strong></p>
          <p>If you didn't request this, you can ignore this message.</p>
        </div>
      `;
      const { error: sendError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: email,
        subject: "Your verification code",
        html,
      });
      if (sendError) {
        return NextResponse.json({ error: `Email send failed: ${sendError.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}