import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";

/**
 * GET /api/events-stream
 * Server-Sent Events (SSE) endpoint for real-time push notifications.
 * Dashboard subscribes to this to get instant updates when events change.
 */

// In-memory subscriber map: userId -> Set of SSE controllers
const subscribers = new Map<string, Set<ReadableStreamDefaultController>>();

export function notifyUser(userId: string, data: object) {
  const controllers = subscribers.get(userId);
  if (!controllers) return;
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const controller of controllers) {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch {
      // Controller closed, remove it
      controllers.delete(controller);
    }
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.id;

  const stream = new ReadableStream({
    start(controller) {
      // Register subscriber
      if (!subscribers.has(userId)) {
        subscribers.set(userId, new Set());
      }
      subscribers.get(userId)!.add(controller);

      // Send initial ping
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      );

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        subscribers.get(userId)?.delete(controller);
        if (subscribers.get(userId)?.size === 0) {
          subscribers.delete(userId);
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering
    },
  });
}
