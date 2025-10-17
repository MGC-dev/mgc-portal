// app/api/send-smtp-test/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET() {
  // 1. Create transporter using Zoho SMTP
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,          // SSL port
    secure: true,       // true for SSL
    auth: {
      user: "mgcentral@mgconsultingfirm.com",
      pass: process.env.SMTP_PASS || "rMqEB7tae3pm", // store in .env
    },
  });

  try {
    // 2. Verify connection
    await transporter.verify();

    // 3. Send test email
    const info = await transporter.sendMail({
      from: '"MG Consulting" <mgcentral@mgconsultingfirm.com>',
      to: "aksuba7@gmail.com",
      subject: "Zoho SMTP Test ✅",
      text: "SMTP connection verified and working safely in production!",
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    // Return detailed error for debugging
    return NextResponse.json(
      { success: false, error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
