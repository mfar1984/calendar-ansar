import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { generateSingleEventICS } from "@/lib/ics";
import {
  xmlResponse,
  multiStatus,
  davResponse,
  propStat,
  buildCalendarResponse,
  buildEventResponse,
  escapeXml,
  parseICSEvent,
} from "@/lib/caldav";
import { randomUUID } from "crypto";

/**
 * CalDAV endpoint: /api/caldav/[userId]/[calendarId]/[eventUid].ics
 *
 * Supports:
 *   OPTIONS   — advertise CalDAV capabilities
 *   PROPFIND  — discover calendar properties
 *   REPORT    — fetch events (calendar-query, calendar-multiget)
 *   GET       — fetch single event ICS
 *   PUT       — create or update event
 *   DELETE    — delete event
 */

// CalDAV uses Basic Auth (username:password base64)
function getBasicAuth(request: NextRequest): { email: string; password: string } | null {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
    const colonIdx = decoded.indexOf(":");
    if (colonIdx === -1) return null;
    return {
      email: decoded.slice(0, colonIdx),
      password: decoded.slice(colonIdx + 1),
    };
  } catch {
    return null;
  }
}

// Also support Bearer token (JWT) for web clients
function getBearerAuth(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7));
}

async function authenticateCalDAV(request: NextRequest) {
  // Try Bearer first
  const bearer = getBearerAuth(request);
  if (bearer) {
    const user = await db.user.findUnique({ where: { id: bearer.id } });
    return user;
  }

  // Try Basic Auth
  const basic = getBasicAuth(request);
  if (!basic) return null;

  const user = await db.user.findUnique({ where: { email: basic.email } });
  if (!user) return null;

  const bcrypt = await import("bcryptjs");
  const valid = await bcrypt.compare(basic.password, user.password);
  return valid ? user : null;
}

function requireAuthResponse() {
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Calendar"',
    },
  });
}

// Parse path segments: [userId, calendarId?, eventFile?]
function parsePath(segments: string[]) {
  return {
    userId: segments[0] ?? null,
    calendarId: segments[1] ?? null,
    eventFile: segments[2] ?? null, // e.g. "uid.ics"
  };
}

// OPTIONS — advertise CalDAV support
export async function OPTIONS(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  await params; // consume
  return new Response(null, {
    status: 200,
    headers: {
      Allow: "OPTIONS, GET, HEAD, PUT, DELETE, PROPFIND, REPORT, MKCALENDAR",
      DAV: "1, 2, calendar-access",
      "Content-Length": "0",
    },
  });
}

// HEAD — same as GET but no body
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const res = await GET(request, { params });
  return new Response(null, { status: res.status, headers: res.headers });
}

/**
 * POST — used as a dispatch endpoint for non-standard HTTP methods.
 * The custom server (server.js) rewrites PROPFIND/REPORT/MKCALENDAR to POST
 * and sets the x-original-method header. Next.js doesn't natively support
 * those methods, so we handle them via this POST shim.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const originalMethod = request.headers.get("x-original-method")?.toUpperCase();

  if (originalMethod === "PROPFIND") {
    return PROPFIND(request, { params });
  }
  if (originalMethod === "REPORT") {
    return REPORT(request, { params });
  }
  if (originalMethod === "MKCALENDAR" || originalMethod === "MKCOL") {
    // Calendar creation — for now, return 201 to signal success
    // (calendars are managed via the dashboard, not CalDAV)
    return new Response(null, { status: 201 });
  }
  if (originalMethod === "PROPPATCH") {
    // Property update — return 207 multi-status with all properties as 200 OK
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<D:multistatus xmlns:D="DAV:"></D:multistatus>`,
      { status: 207, headers: { "Content-Type": "application/xml" } }
    );
  }

  return new Response("Method Not Allowed", { status: 405 });
}

// GET — fetch single event ICS
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const user = await authenticateCalDAV(request);
  if (!user) return requireAuthResponse();

  const segments = await params;
  const { calendarId, eventFile } = parsePath(segments.path);

  if (!calendarId || !eventFile) {
    return new Response("Not Found", { status: 404 });
  }

  const uid = eventFile.replace(/\.ics$/, "");
  const event = await db.event.findFirst({
    where: { uid, calendar: { id: calendarId } },
  });

  if (!event) return new Response("Not Found", { status: 404 });

  const ics = generateSingleEventICS(event);
  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      ETag: `"${event.etag}"`,
    },
  });
}

// PUT — create or update event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const user = await authenticateCalDAV(request);
  if (!user) return requireAuthResponse();

  const segments = await params;
  const { calendarId, eventFile } = parsePath(segments.path);

  if (!calendarId || !eventFile) {
    return new Response("Bad Request", { status: 400 });
  }

  // Check calendar access
  const calendar = await db.calendar.findFirst({
    where: {
      id: calendarId,
      OR: [
        { userId: user.id },
        { shares: { some: { userId: user.id, permission: "write" } } },
      ],
    },
  });

  if (!calendar) return new Response("Forbidden", { status: 403 });

  const icsText = await request.text();
  const parsed = parseICSEvent(icsText);

  if (!parsed) {
    return new Response("Bad Request: Invalid ICS", { status: 400 });
  }

  const uid = eventFile.replace(/\.ics$/, "");
  const newEtag = randomUUID();

  const existing = await db.event.findUnique({ where: { uid } });

  if (existing) {
    // Check If-Match header for conflict detection
    const ifMatch = request.headers.get("if-match");
    if (ifMatch && ifMatch !== `"${existing.etag}"` && ifMatch !== "*") {
      return new Response("Precondition Failed", { status: 412 });
    }

    await db.event.update({
      where: { uid },
      data: {
        title: parsed.title,
        description: parsed.description,
        location: parsed.location,
        startAt: parsed.startAt,
        endAt: parsed.endAt,
        allDay: parsed.allDay,
        etag: newEtag,
      },
    });

    return new Response(null, {
      status: 204,
      headers: { ETag: `"${newEtag}"` },
    });
  } else {
    await db.event.create({
      data: {
        uid,
        calendarId: calendar.id,
        title: parsed.title,
        description: parsed.description,
        location: parsed.location,
        startAt: parsed.startAt,
        endAt: parsed.endAt,
        allDay: parsed.allDay,
        etag: newEtag,
      },
    });

    return new Response(null, {
      status: 201,
      headers: {
        ETag: `"${newEtag}"`,
        Location: `/api/caldav/${user.id}/${calendar.id}/${uid}.ics`,
      },
    });
  }
}

// DELETE — delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const user = await authenticateCalDAV(request);
  if (!user) return requireAuthResponse();

  const segments = await params;
  const { calendarId, eventFile } = parsePath(segments.path);

  if (!calendarId || !eventFile) {
    return new Response("Bad Request", { status: 400 });
  }

  const calendar = await db.calendar.findFirst({
    where: {
      id: calendarId,
      OR: [
        { userId: user.id },
        { shares: { some: { userId: user.id, permission: "write" } } },
      ],
    },
  });

  if (!calendar) return new Response("Forbidden", { status: 403 });

  const uid = eventFile.replace(/\.ics$/, "");
  const event = await db.event.findFirst({
    where: { uid, calendarId: calendar.id },
  });

  if (!event) return new Response("Not Found", { status: 404 });

  await db.event.delete({ where: { uid } });
  return new Response(null, { status: 204 });
}

// Next.js doesn't export PROPFIND/REPORT natively — we handle them via a catch-all
// by exporting a generic handler that checks the method.
// We use the special Next.js pattern: export named functions for each method.
// For non-standard methods, we need to handle them differently.

// PROPFIND — discover calendar properties
// REPORT — fetch events
// These are handled via a workaround: Next.js supports any HTTP method via named exports
// but PROPFIND and REPORT are not standard. We use a POST-like approach via the
// next.config.js rewrites OR handle them in a catch-all.

// Since Next.js App Router supports custom HTTP methods via named exports,
// we export PROPFIND and REPORT as named async functions:

export async function PROPFIND(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const user = await authenticateCalDAV(request);
  if (!user) return requireAuthResponse();

  const segments = await params;
  const { userId, calendarId } = parsePath(segments.path);

  // PROPFIND on /api/caldav/[userId]/ — list calendars
  if (!calendarId) {
    const calendars = await db.calendar.findMany({
      where: {
        OR: [
          { userId: user.id },
          { shares: { some: { userId: user.id } } },
        ],
      },
    });

    const responses = [
      // Principal response
      davResponse(`/api/caldav/${user.id}/`, [
        propStat("200 OK", `
          <D:displayname>${escapeXml(user.name)}</D:displayname>
          <D:resourcetype><D:collection/></D:resourcetype>
          <D:current-user-principal><D:href>/api/caldav/${user.id}/</D:href></D:current-user-principal>
          <C:calendar-home-set xmlns:C="urn:ietf:params:xml:ns:caldav"><D:href>/api/caldav/${user.id}/</D:href></C:calendar-home-set>
        `),
      ]),
      // Each calendar
      ...calendars.map((cal) => {
        const ctag = cal.updatedAt.getTime().toString();
        return davResponse(`/api/caldav/${user.id}/${cal.id}/`, [
          propStat("200 OK", `
            <D:displayname>${escapeXml(cal.name)}</D:displayname>
            <D:resourcetype>
              <D:collection/>
              <C:calendar xmlns:C="urn:ietf:params:xml:ns:caldav"/>
            </D:resourcetype>
            <CS:getctag xmlns:CS="http://calendarserver.org/ns/">${escapeXml(ctag)}</CS:getctag>
            <C:supported-calendar-component-set xmlns:C="urn:ietf:params:xml:ns:caldav">
              <C:comp name="VEVENT"/>
            </C:supported-calendar-component-set>
            <ICAL:calendar-color xmlns:ICAL="http://apple.com/ns/ical/">${escapeXml(cal.color)}</ICAL:calendar-color>
          `),
        ]);
      }),
    ];

    return xmlResponse(multiStatus(responses));
  }

  // PROPFIND on /api/caldav/[userId]/[calendarId]/ — calendar properties
  const calendar = await db.calendar.findFirst({
    where: {
      id: calendarId,
      OR: [
        { userId: user.id },
        { shares: { some: { userId: user.id } } },
      ],
    },
  });

  if (!calendar) return new Response("Not Found", { status: 404 });

  const ctag = calendar.updatedAt.getTime().toString();
  const xml = buildCalendarResponse(
    `/api/caldav/${user.id}/${calendarId}/`,
    calendar.name,
    calendar.description ?? "",
    calendar.color,
    ctag
  );

  return xmlResponse(xml);
}

export async function REPORT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const user = await authenticateCalDAV(request);
  if (!user) return requireAuthResponse();

  const segments = await params;
  const { calendarId } = parsePath(segments.path);

  if (!calendarId) {
    return new Response("Bad Request", { status: 400 });
  }

  const calendar = await db.calendar.findFirst({
    where: {
      id: calendarId,
      OR: [
        { userId: user.id },
        { shares: { some: { userId: user.id } } },
      ],
    },
    include: { events: true },
  });

  if (!calendar) return new Response("Not Found", { status: 404 });

  const body = await request.text();

  // calendar-multiget: client requests specific event hrefs
  if (body.includes("calendar-multiget")) {
    const hrefMatches = [...body.matchAll(/<[^:]*:?href[^>]*>([^<]+)<\/[^:]*:?href>/gi)];
    const requestedUids = hrefMatches
      .map((m) => m[1].trim())
      .filter((h) => h.endsWith(".ics"))
      .map((h) => h.split("/").pop()!.replace(/\.ics$/, ""));

    const events = requestedUids.length > 0
      ? await db.event.findMany({
          where: { uid: { in: requestedUids }, calendarId },
        })
      : calendar.events;

    const eventResponses = events.map((event) => {
      const ics = generateSingleEventICS(event);
      return buildEventResponse(
        `/api/caldav/${user.id}/${calendarId}/${event.uid}.ics`,
        event.etag,
        ics
      );
    });

    return xmlResponse(multiStatus(eventResponses));
  }

  // calendar-query: return all events (with optional time range filter)
  const eventResponses = calendar.events.map((event) => {
    const ics = generateSingleEventICS(event);
    return buildEventResponse(
      `/api/caldav/${user.id}/${calendarId}/${event.uid}.ics`,
      event.etag,
      ics
    );
  });

  return xmlResponse(multiStatus(eventResponses));
}
