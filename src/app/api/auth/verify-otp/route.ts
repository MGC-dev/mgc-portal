import { NextResponse } from "next/server";
import { hashCode } from "@/lib/otp-store";
import { createAdminSupabaseClient } from "@/lib/supabase-server";

// POST /api/auth/verify-otp
// Body: { email: string, code: string }
// Returns: { ok: boolean }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code } = body || {};
    if (!email || !code) {
      return NextResponse.json({ error: "Missing email or code" }, { status: 400 });
    }

    // Normalize email to avoid whitespace/case mismatches
    const normalizedEmail = String(email).trim().toLowerCase();

    const admin = createAdminSupabaseClient();

    const { data: otps, error: fetchError } = await admin
      .from("email_otps")
      .select("id, email, code_hash, expires_at, used, attempts, metadata, user_id, created_at")
      .eq("email", normalizedEmail)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const pending = otps?.[0];
    if (!pending) {
      return NextResponse.json({ error: "No OTP pending for this email" }, { status: 400 });
    }

    const now = Date.now();
    const expiresAt = new Date(pending.expires_at).getTime();
    if (now > expiresAt) {
      // Optionally mark as used/expired
      await admin.from("email_otps").update({ used: true }).eq("id", pending.id);
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    const isValid = hashCode(String(code).trim()) === pending.code_hash;
    if (!isValid) {
      await admin
        .from("email_otps")
        .update({ attempts: (pending.attempts ?? 0) + 1 })
        .eq("id", pending.id);
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    // Mark OTP as used and increment attempts
    const { error: updateError } = await admin
      .from("email_otps")
      .update({ used: true, attempts: (pending.attempts ?? 0) + 1 })
      .eq("id", pending.id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Mark email confirmed for the newly created user
    const userId = pending.user_id;
    if (userId) {
      const { error } = await admin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      } as any);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Immediately upsert a profile row for this user using metadata captured at signup
    if (userId) {
      const meta = (pending.metadata as any) || {};
      const profilePayload = {
        id: userId,
        email: normalizedEmail,
        full_name: meta.full_name ?? null,
        company_name: meta.company_name ?? null,
        phone: meta.phone ?? null,
        address: meta.address ?? null,
        role: meta.role ?? "client",
      };

      const { error: profileError } = await admin
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" });

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}