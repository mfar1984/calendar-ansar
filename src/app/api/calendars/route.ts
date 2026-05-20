import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

// GET /api/calendars — list all calendars for current user (owned + shared)
export async function GET() {
  try {
    const session = await requireAuth();

    const [owned, shared] = await Promise.all([
      db.calendar.findMany({
        where: { userId: session.id },
        include: { _count: { select: { events: true } } },
        orderBy: { createdAt: "asc" },
      }),
      db.calendarShare.findMany({
        where: { userId: session.id },
        include: {
          calendar: {
            include: {
              _count: { select: { events: true } },
              user: { select: { name: true, email: true } },
            },
          },
        },
      }),
    ]);

    return Response.json({
      owned,
      shared: shared.map((s) => ({ ...s.calendar, permission: s.permission })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/calendars error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/calendars — create a new calendar
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { name, description, color } = await request.json();

    if (!name) {
      return Response.json({ error: "Calendar name is required" }, { status: 400 });
    }

    const calendar = await db.calendar.create({
      data: {
        name,
        description: description ?? null,
        color: color ?? "#3B82F6",
        userId: session.id,
        token: randomBytes(24).toString("hex"),
      },
    });

    return Response.json({ calendar }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/calendars error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
