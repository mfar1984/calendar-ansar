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

// PATCH /api/calendars/[calendarId]/events/[eventId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ calendarId: string; eventId: string }> }
) {
  try {
    const session = await requireAuth();
    const { calendarId, eventId } = await params;
    const result = await getCalendarWithAccess(calendarId, session.id);
    if (!result) {
      return Response.json({ error: "Calendar not found" }, { status: 404 });
    }
    if (result.permission !== "write") {
      return Response.json({ error: "Read-only access" }, { status: 403 });
    }

    const event = await db.event.findFirst({ where: { id: eventId, calendarId } });
    if (!event) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }

    const {
      title, description, location, startAt, endAt, allDay,
      status, reminder, category, categoryColor, isPrivate, recurrence,
    } = await request.json();

    const updated = await db.event.update({
      where: { id: eventId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(location !== undefined && { location }),
        ...(startAt && { startAt: new Date(startAt) }),
        ...(endAt && { endAt: new Date(endAt) }),
        ...(allDay !== undefined && { allDay }),
        ...(status !== undefined && { status }),
        ...(reminder !== undefined && { reminder }),
        ...(category !== undefined && { category }),
        ...(categoryColor !== undefined && { categoryColor }),
        ...(isPrivate !== undefined && { isPrivate }),
        ...(recurrence !== undefined && { recurrence: recurrence ? JSON.stringify(recurrence) : null }),
        etag: randomUUID(),
      },
    });

    // Notify shared users
    console.log(`[Notify] Event UPDATED: "${updated.title}" in calendar ${calendarId} by user ${session.id}`);
    notifyCalendarUsers(calendarId, session.id, "updated", {
      title: updated.title,
      startAt: updated.startAt,
      endAt: updated.endAt,
      location: updated.location,
      description: updated.description,
    }).catch(console.error);

    return Response.json({ event: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/calendars/[calendarId]/events/[eventId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ calendarId: string; eventId: string }> }
) {
  try {
    const session = await requireAuth();
    const { calendarId, eventId } = await params;
    const result = await getCalendarWithAccess(calendarId, session.id);
    if (!result) {
      return Response.json({ error: "Calendar not found" }, { status: 404 });
    }
    if (result.permission !== "write") {
      return Response.json({ error: "Read-only access" }, { status: 403 });
    }

    const event = await db.event.findFirst({ where: { id: eventId, calendarId } });
    if (!event) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }

    await db.event.delete({ where: { id: eventId } });

    // Notify shared users
    console.log(`[Notify] Event DELETED: "${event.title}" in calendar ${calendarId} by user ${session.id}`);
    notifyCalendarUsers(calendarId, session.id, "deleted", {
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      location: event.location,
    }).catch(console.error);

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
