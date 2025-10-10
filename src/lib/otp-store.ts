import crypto from "crypto";

export type OTPRecord = {
  email: string;
  codeHash: string;
  createdAt: number;
  expiresAt: number;
  metadata?: Record<string, any> | null;
  password?: string | null; // For demo/dev only; do NOT store plaintext in production
  used: boolean;
  attempts: number;
};

// In-memory OTP store (development/demo only). For production, use a durable store (DB/Redis).
const store = new Map<string, OTPRecord>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function setOTP(
  email: string,
  code: string,
  ttlSeconds: number,
  opts?: { metadata?: Record<string, any> | null; password?: string | null }
): OTPRecord {
  const now = Date.now();
  const record: OTPRecord = {
    email,
    codeHash: hashCode(code),
    createdAt: now,
    expiresAt: now + ttlSeconds * 1000,
    metadata: opts?.metadata ?? null,
    password: opts?.password ?? null,
    used: false,
    attempts: 0,
  };
  store.set(normalizeEmail(email), record);
  return record;
}

export function getOTP(email: string): OTPRecord | undefined {
  return store.get(normalizeEmail(email));
}

export function consumeOTP(email: string, code: string): { ok: boolean; reason?: string; record?: OTPRecord } {
  const rec = store.get(normalizeEmail(email));
  if (!rec) return { ok: false, reason: "No OTP found for email" };
  if (rec.used) return { ok: false, reason: "OTP already used" };
  const now = Date.now();
  if (now > rec.expiresAt) return { ok: false, reason: "OTP expired" };
  rec.attempts += 1;
  if (hashCode(code) !== rec.codeHash) return { ok: false, reason: "Invalid code" };
  rec.used = true;
  store.set(normalizeEmail(email), rec);
  return { ok: true, record: rec };
}