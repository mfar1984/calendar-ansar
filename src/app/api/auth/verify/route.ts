import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return redirect("/login?error=invalid_token");
  }

  const user = await db.user.findUnique({ where: { verifyToken: token } });

  if (!user) {
    return redirect("/login?error=invalid_token");
  }

  if (user.emailVerified) {
    return redirect("/login?verified=already");
  }

  if (user.verifyExpiry && user.verifyExpiry < new Date()) {
    return redirect("/login?error=token_expired");
  }

  // Mark as verified
  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verifyToken: null,
      verifyExpiry: null,
    },
  });

  // Auto-login after verification
  const jwtToken = signToken({ id: user.id, email: user.email, name: user.name });
  const cookieStore = await cookies();
  cookieStore.set("auth_token", jwtToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return redirect("/dashboard?verified=true");
}
