import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { notifyCalendarUsers } from "@/lib/notifyCalendar";

async function getCalendarWithAccess(calendarId: string, userId: string) {
  const calendar = await db.calendar.findUnique({
    where: { id: calendarId },
    include: { shares: { where: { userId } } },
  });
  if (!calendar) return null;
  const isOwner = calendar.userId === userId;
  const share = calendar.shares[0];
  if (!isOwner && !share) return null;
  return { calendar, isOwner, permission: isOwner ? "write" : share.permission };
}

// GET /api/calendars/[calendarId]/events
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ calendarId: string }> }
) {
  try {
    const session = await requireAuth();
    const { calendarId } = await params;
    const result = await getCalendarWithAccess(calendarId, session.id);
    if (!result) {
      return Response.json({ error: "Calendar not found" }, { status: 404 });
    }

    const events = await db.event.findMany({
      where: { calendarId },
      orderBy: { startAt: "asc" },
    });

    return Response.json({ events });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/calendars/[calendarId]/events
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ calendarId: string }> }
) {
  try {
    const session = await requireAuth();
    const { calendarId } = await params;
    const result = await getCalendarWithAccess(calendarId, session.id);
    if (!result) {
      return Response.json({ error: "Calendar not found" }, { status: 404 });
    }
    if (result.permission !== "write") {
      return Response.json({ error: "Read-only access" }, { status: 403 });
    }

    const {
      title, description, location, startAt, endAt, allDay,
      status, reminder, category, categoryColor, isPrivate, recurrence,
    } = await request.json();

    if (!title || !startAt || !endAt) {
      return Response.json(
        { error: "title, startAt and endAt are required" },
        { status: 400 }
      );
    }

    const event = await db.event.create({
      data: {
        uid: `${randomUUID()}@calendar.ansartechnologies.my`,
        calendarId,
        title,
        description: description ?? null,
        location: location ?? null,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        allDay: allDay ?? false,
        etag: randomUUID(),
        status: status ?? "busy",
        reminder: reminder ?? null,
        category: category ?? null,
        categoryColor: categoryColor ?? null,
        isPrivate: isPrivate ?? false,
        recurrence: recurrence ? JSON.stringify(recurrence) : null,
      },
    });

    // Notify shared users (fire and forget — don't block response)
    console.log(`[Notify] Event CREATED: "${event.title}" in calendar ${calendarId} by user ${session.id}`);
    notifyCalendarUsers(calendarId, session.id, "created", {
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      location: event.location,
      description: event.description,
    }).catch(console.error);

    return Response.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
