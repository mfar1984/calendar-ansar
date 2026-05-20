import ical, { ICalCalendarMethod } from "ical-generator";
import { db } from "./db";

function stripHtml(html: string | null | undefined): string | undefined {
  if (!html) return undefined;
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim() || undefined;
}

/**
 * Generate ICS feed string for a calendar by its token.
 * Used for Outlook / Google Calendar subscribe links.
 */
export async function generateICSFeed(token: string): Promise<string | null> {
  const calendar = await db.calendar.findUnique({
    where: { token },
    include: {
      events: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!calendar) return null;

  const cal = ical({
    name: calendar.name,
    description: calendar.description ?? undefined,
    method: ICalCalendarMethod.PUBLISH,
    prodId: {
      company: "AnSar Technologies",
      product: "Calendar",
      language: "EN",
    },
  });

  for (const event of calendar.events) {
    cal.createEvent({
      id: event.uid,
      summary: event.title,
      description: stripHtml(event.description),
      location: event.location ?? undefined,
      start: event.startAt,
      end: event.endAt,
      allDay: event.allDay,
      created: event.createdAt,
      lastModified: event.updatedAt,
    });
  }

  return cal.toString();
}

/**
 * Generate ICS string for a single event (untuk CalDAV GET response).
 */
export function generateSingleEventICS(event: {
  uid: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  createdAt: Date;
  updatedAt: Date;
}): string {
  const cal = ical({
    name: "Event",
    method: ICalCalendarMethod.PUBLISH,
    prodId: {
      company: "AnSar Technologies",
      product: "Calendar",
      language: "EN",
    },
  });

  cal.createEvent({
    id: event.uid,
    summary: event.title,
    description: stripHtml(event.description),
    location: event.location ?? undefined,
    start: event.startAt,
    end: event.endAt,
    allDay: event.allDay,
    created: event.createdAt,
    lastModified: event.updatedAt,
  });

  return cal.toString();
}
