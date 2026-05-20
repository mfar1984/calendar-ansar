import { NextRequest } from "next/server";
import { generateICSFeed } from "@/lib/ics";

/**
 * GET /api/feed/[token]
 * Public ICS feed endpoint — no auth required.
 * Clients (Outlook, Google Calendar) subscribe to this URL.
 * webcal://yourdomain.com/api/feed/[token]
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const ics = await generateICSFeed(token);

  if (!ics) {
    return new Response("Calendar not found", { status: 404 });
  }

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "inline; filename=calendar.ics",
      // Allow calendar apps to cache for 15 minutes
      "Cache-Control": "public, max-age=900",
    },
  });
}
