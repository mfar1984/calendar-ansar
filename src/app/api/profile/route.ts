import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// GET /api/profile
export async function GET() {
  try {
    const session = await requireAuth();
    const user = await db.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        notifyEmail: true,
        notifySms: true,
        createdAt: true,
      },
    });
    if (!user) return Response.json({ error: "User not found" }, { status: 404 });
    return Response.json({ user });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { name, phone, notifyEmail, notifySms, currentPassword, newPassword } =
      await request.json();

    // If changing password, verify current password first
    if (newPassword) {
      if (!currentPassword) {
        return Response.json(
          { error: "Current password is required to set a new password" },
          { status: 400 }
        );
      }
      const user = await db.user.findUnique({ where: { id: session.id } });
      if (!user) return Response.json({ error: "User not found" }, { status: 404 });

      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return Response.json({ error: "Current password is incorrect" }, { status: 400 });
      }
    }

    const updated = await db.user.update({
      where: { id: session.id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(notifyEmail !== undefined && { notifyEmail }),
        ...(notifySms !== undefined && { notifySms }),
        ...(newPassword && { password: await bcrypt.hash(newPassword, 12) }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        notifyEmail: true,
        notifySms: true,
      },
    });

    return Response.json({ user: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/profile error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
