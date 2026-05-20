import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getCalendarWithAccess(calendarId: string, userId: string) {
  const calendar = await db.calendar.findUnique({
    where: { id: calendarId },
    include: {
      shares: { where: { userId } },
    },
  });
  if (!calendar) return null;
  const isOwner = calendar.userId === userId;
  const share = calendar.shares[0];
  if (!isOwner && !share) return null;
  return { calendar, isOwner, permission: isOwner ? "write" : share.permission };
}

// GET /api/calendars/[calendarId]
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
    return Response.json({ calendar: result.calendar, permission: result.permission });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/calendars/[calendarId]
export async function PATCH(
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
    if (!result.isOwner) {
      return Response.json({ error: "Only the owner can edit this calendar" }, { status: 403 });
    }

    const { name, description, color } = await request.json();
    const updated = await db.calendar.update({
      where: { id: calendarId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
      },
    });
    return Response.json({ calendar: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/calendars/[calendarId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ calendarId: string }> }
) {
  try {
    const session = await requireAuth();
    const { calendarId } = await params;
    const calendar = await db.calendar.findUnique({ where: { id: calendarId } });
    if (!calendar || calendar.userId !== session.id) {
      return Response.json({ error: "Calendar not found" }, { status: 404 });
    }
    await db.calendar.delete({ where: { id: calendarId } });
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
