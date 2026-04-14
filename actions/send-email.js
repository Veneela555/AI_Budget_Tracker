"use server";

import { Resend } from "resend";

export async function sendEmail({ to, subject, react }) {
  try {
     console.log("🔑 RESEND KEY:", process.env.RESEND_API_KEY);
    // ✅ Check if API key exists
    if (!process.env.RESEND_API_KEY) {
      throw new Error("❌ RESEND_API_KEY is missing in .env");
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // ✅ Send email
    const data = await resend.emails.send({
      from: "Finance App <onboarding@resend.dev>", // ✅ SAFE TEST EMAIL
      to,
      subject,
      react,
    });

    console.log("✅ Email sent successfully:", data);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("❌ Email sending failed:", error);

    return {
      success: false,
      error: error.message,
    };
  }
}