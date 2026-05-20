import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/calendars/[calendarId]/share — list shares
export async function GET(
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

    const shares = await db.calendarShare.findMany({
      where: { calendarId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return Response.json({ shares });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/calendars/[calendarId]/share — share with a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ calendarId: string }> }
) {
  try {
    const session = await requireAuth();
    const { calendarId } = await params;
    const { email, permission } = await request.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const calendar = await db.calendar.findUnique({ where: { id: calendarId } });
    if (!calendar || calendar.userId !== session.id) {
      return Response.json({ error: "Calendar not found" }, { status: 404 });
    }

    const targetUser = await db.user.findUnique({ where: { email } });
    if (!targetUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.id === session.id) {
      return Response.json({ error: "Cannot share with yourself" }, { status: 400 });
    }

    const share = await db.calendarShare.upsert({
      where: { calendarId_userId: { calendarId, userId: targetUser.id } },
      create: {
        calendarId,
        userId: targetUser.id,
        permission: permission ?? "read",
      },
      update: { permission: permission ?? "read" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return Response.json({ share }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/calendars/[calendarId]/share — remove a share
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ calendarId: string }> }
) {
  try {
    const session = await requireAuth();
    const { calendarId } = await params;
    const { userId } = await request.json();

    const calendar = await db.calendar.findUnique({ where: { id: calendarId } });
    if (!calendar || calendar.userId !== session.id) {
      return Response.json({ error: "Calendar not found" }, { status: 404 });
    }

    await db.calendarShare.deleteMany({
      where: { calendarId, userId },
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
