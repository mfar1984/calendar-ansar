import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { sendEmail } from "@/lib/notifications";

const ALLOWED_DOMAIN = "ansartechnologies.my";
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return Response.json(
        { error: "Name, email and password are required" },
        { status: 400 }
      );
    }

    // Enforce domain restriction
    const emailDomain = email.split("@")[1]?.toLowerCase();
    if (emailDomain !== ALLOWED_DOMAIN) {
      return Response.json(
        { error: `Registration is only allowed for @${ALLOWED_DOMAIN} email addresses` },
        { status: 403 }
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    const verifyToken = randomBytes(32).toString("hex");
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashed,
        emailVerified: false,
        verifyToken,
        verifyExpiry,
      },
    });

    // Create default calendar
    await db.calendar.create({
      data: {
        name: `${name}'s Calendar`,
        description: "My personal calendar",
        userId: user.id,
        token: randomBytes(24).toString("hex"),
      },
    });

    // Send verification email
    const verifyUrl = `${APP_URL}/api/auth/verify?token=${verifyToken}`;
    await sendEmail({
      to: email,
      subject: "Verify your AnSar Calendar account",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #0078d4; padding: 32px 28px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">Verify Your Account</h1>
    </div>
    <div style="padding: 32px 28px;">
      <p style="color: #444; margin: 0 0 16px; font-size: 15px;">Hi <strong>${name}</strong>,</p>
      <p style="color: #444; margin: 0 0 24px; font-size: 15px;">
        Thank you for registering with <strong>AnSar Calendar</strong>. Please verify your email address to activate your account.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${verifyUrl}"
           style="display: inline-block; background: #0078d4; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600;">
          Verify Email Address
        </a>
      </div>
      <p style="color: #888; font-size: 13px; margin: 0;">
        This link will expire in <strong>24 hours</strong>. If you did not create this account, you can safely ignore this email.
      </p>
    </div>
    <div style="padding: 16px 28px; border-top: 1px solid #eee; color: #aaa; font-size: 12px; text-align: center;">
      AnSar Technologies Sdn Bhd · ansartechnologies.my
    </div>
  </div>
</body>
</html>`,
    });

    return Response.json({
      message: "Registration successful. Please check your email to verify your account.",
      email,
    }, { status: 201 });

  } catch (error) {
    console.error("Register error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
