import nodemailer from "nodemailer";

// ─── Email via SMTP ───────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || "AnSar Calendar <calendar@ansartechnologies.my>",
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]+>/g, ""),
    });
    console.log(`[Email] ✓ Sent to ${to} | Subject: ${subject} | ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[Email] ✗ Failed to send to ${to}:`, error);
    return false;
  }
}

// ─── SMS via Infobip ──────────────────────────────────────────────────────────

export async function sendSms({
  to,
  message,
}: {
  to: string;
  message: string;
}): Promise<boolean> {
  const baseUrl = process.env.INFOBIP_BASE_URL;
  const apiKey = process.env.INFOBIP_API_KEY;
  const sender = process.env.INFOBIP_SENDER || "62033";

  if (!baseUrl || !apiKey) {
    console.error("[SMS] Infobip credentials not configured");
    return false;
  }

  // Normalize Malaysian phone number:
  // 0128834665  → 60128834665
  // +60128834665 → 60128834665
  // 60128834665  → 60128834665 (unchanged)
  let phone = to.trim().replace(/\s+/g, "").replace(/-/g, "");
  if (phone.startsWith("+")) {
    phone = phone.slice(1);
  } else if (phone.startsWith("0")) {
    phone = "6" + phone; // 0128834665 → 60128834665
  }
  // If already starts with 60, leave as is

  try {
    const res = await fetch(`${baseUrl}/sms/2/text/advanced`, {
      method: "POST",
      headers: {
        Authorization: `App ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            from: sender,
            destinations: [{ to: phone }],
            text: message,
          },
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`[SMS] ✗ Infobip error to ${phone}:`, data);
      return false;
    }
    const msgStatus = data.messages?.[0]?.status?.name ?? "UNKNOWN";
    console.log(`[SMS] ✓ Sent to ${phone} | Status: ${msgStatus}`);
    return true;
  } catch (error) {
    console.error(`[SMS] ✗ Failed to send to ${phone}:`, error);
    return false;
  }
}

// ─── Notification Templates ───────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleString("en-MY", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildEventCreatedEmail(params: {
  recipientName: string;
  eventTitle: string;
  calendarName: string;
  startAt: Date;
  endAt: Date;
  location?: string | null;
  description?: string | null;
  sharedByName: string;
  appUrl: string;
}): { subject: string; html: string } {
  const subject = `📅 New event: ${params.eventTitle}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1);">
    <div style="background: #0078d4; padding: 24px 28px;">
      <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">📅 New Calendar Event</h1>
    </div>
    <div style="padding: 28px;">
      <p style="color: #444; margin: 0 0 20px;">Hi ${params.recipientName},</p>
      <p style="color: #444; margin: 0 0 20px;"><strong>${params.sharedByName}</strong> added a new event to <strong>${params.calendarName}</strong>.</p>

      <div style="background: #f8f9fa; border-left: 4px solid #0078d4; border-radius: 4px; padding: 16px 20px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px; font-size: 18px; color: #111;">${params.eventTitle}</h2>
        <p style="margin: 0 0 6px; color: #555; font-size: 14px;">
          🕐 <strong>${formatDate(params.startAt)}</strong> – ${formatDate(params.endAt)}
        </p>
        ${params.location ? `<p style="margin: 0 0 6px; color: #555; font-size: 14px;">📍 ${params.location}</p>` : ""}
        ${params.description ? `<p style="margin: 8px 0 0; color: #666; font-size: 13px;">${params.description.replace(/<[^>]+>/g, "")}</p>` : ""}
      </div>

      <a href="${params.appUrl}/dashboard" style="display: inline-block; background: #0078d4; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-size: 14px; font-weight: 600;">View Calendar →</a>
    </div>
    <div style="padding: 16px 28px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
      AnSar Calendar · <a href="${params.appUrl}" style="color: #999;">ansartechnologies.my</a>
    </div>
  </div>
</body>
</html>`;
  return { subject, html };
}

export function buildEventUpdatedEmail(params: {
  recipientName: string;
  eventTitle: string;
  calendarName: string;
  startAt: Date;
  endAt: Date;
  location?: string | null;
  updatedByName: string;
  appUrl: string;
}): { subject: string; html: string } {
  const subject = `✏️ Event updated: ${params.eventTitle}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1);">
    <div style="background: #107c10; padding: 24px 28px;">
      <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">✏️ Event Updated</h1>
    </div>
    <div style="padding: 28px;">
      <p style="color: #444; margin: 0 0 20px;">Hi ${params.recipientName},</p>
      <p style="color: #444; margin: 0 0 20px;"><strong>${params.updatedByName}</strong> updated an event in <strong>${params.calendarName}</strong>.</p>

      <div style="background: #f8f9fa; border-left: 4px solid #107c10; border-radius: 4px; padding: 16px 20px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 12px; font-size: 18px; color: #111;">${params.eventTitle}</h2>
        <p style="margin: 0 0 6px; color: #555; font-size: 14px;">
          🕐 <strong>${formatDate(params.startAt)}</strong> – ${formatDate(params.endAt)}
        </p>
        ${params.location ? `<p style="margin: 0; color: #555; font-size: 14px;">📍 ${params.location}</p>` : ""}
      </div>

      <a href="${params.appUrl}/dashboard" style="display: inline-block; background: #107c10; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-size: 14px; font-weight: 600;">View Calendar →</a>
    </div>
    <div style="padding: 16px 28px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
      AnSar Calendar · <a href="${params.appUrl}" style="color: #999;">ansartechnologies.my</a>
    </div>
  </div>
</body>
</html>`;
  return { subject, html };
}

export function buildEventDeletedEmail(params: {
  recipientName: string;
  eventTitle: string;
  calendarName: string;
  deletedByName: string;
  appUrl: string;
}): { subject: string; html: string } {
  const subject = `🗑️ Event cancelled: ${params.eventTitle}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1);">
    <div style="background: #d13438; padding: 24px 28px;">
      <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">🗑️ Event Cancelled</h1>
    </div>
    <div style="padding: 28px;">
      <p style="color: #444; margin: 0 0 20px;">Hi ${params.recipientName},</p>
      <p style="color: #444; margin: 0 0 20px;"><strong>${params.deletedByName}</strong> cancelled the event <strong>"${params.eventTitle}"</strong> from <strong>${params.calendarName}</strong>.</p>
      <a href="${params.appUrl}/dashboard" style="display: inline-block; background: #d13438; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-size: 14px; font-weight: 600;">View Calendar →</a>
    </div>
    <div style="padding: 16px 28px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
      AnSar Calendar · <a href="${params.appUrl}" style="color: #999;">ansartechnologies.my</a>
    </div>
  </div>
</body>
</html>`;
  return { subject, html };
}

export function buildSmsMessage(type: "created" | "updated" | "deleted", params: {
  eventTitle: string;
  calendarName: string;
  startAt?: Date;
  endAt?: Date;
  location?: string | null;
  byName: string;
}): string {
  const formatTime = (d: Date) =>
    d.toLocaleString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).replace(",", "");

  const start = params.startAt ? formatTime(params.startAt) : "";
  const end = params.endAt ? formatTime(params.endAt).replace(/^\d+ \w+ \d+ /, "") : ""; // time only for end
  const at = params.location ? ` at ${params.location}` : "";

  let msg = "";

  if (type === "created") {
    msg = `[${params.calendarName}] : "${params.eventTitle}" on ${start} to ${end}${at}. by ${params.byName}`;
  } else if (type === "updated") {
    msg = `[${params.calendarName}] Updated: "${params.eventTitle}" on ${start} to ${end}${at}. by ${params.byName}`;
  } else {
    msg = `[${params.calendarName}] Cancelled: "${params.eventTitle}". by ${params.byName}`;
  }

  // Enforce 160 character limit — truncate title if needed
  if (msg.length <= 160) return msg;

  // Truncate title to fit within 160 chars
  const overhead = msg.length - params.eventTitle.length;
  const maxTitle = 160 - overhead - 3; // 3 for "..."
  const shortTitle = maxTitle > 5 ? params.eventTitle.slice(0, maxTitle) + "..." : params.eventTitle.slice(0, 10) + "...";

  if (type === "created") {
    msg = `[${params.calendarName}] : "${shortTitle}" on ${start} to ${end}${at}. by ${params.byName}`;
  } else if (type === "updated") {
    msg = `[${params.calendarName}] Updated: "${shortTitle}" on ${start} to ${end}${at}. by ${params.byName}`;
  } else {
    msg = `[${params.calendarName}] Cancelled: "${shortTitle}". by ${params.byName}`;
  }

  return msg.slice(0, 160);
}
