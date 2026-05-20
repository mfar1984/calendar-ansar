/**
 * CalDAV XML response builders.
 * CalDAV uses WebDAV (RFC 4918) + RFC 4791.
 * Methods: PROPFIND, REPORT, PUT, DELETE, OPTIONS, MKCALENDAR
 */

export function xmlResponse(body: string, status = 207): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}

/** Build a multistatus response wrapper */
export function multiStatus(responses: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
${responses.join("\n")}
</D:multistatus>`;
}

/** Build a single <D:response> element */
export function davResponse(href: string, propStats: string[]): string {
  return `  <D:response>
    <D:href>${escapeXml(href)}</D:href>
    ${propStats.join("\n    ")}
  </D:response>`;
}

/** Build a <D:propstat> element */
export function propStat(status: string, props: string): string {
  return `<D:propstat>
      <D:prop>${props}</D:prop>
      <D:status>HTTP/1.1 ${status}</D:status>
    </D:propstat>`;
}

/** Escape XML special characters */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Format date to CalDAV format: 20240101T120000Z */
export function toCalDAVDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Parse CalDAV date string to JS Date */
export function fromCalDAVDate(str: string): Date {
  // Handle: 20240101T120000Z or 20240101
  if (str.length === 8) {
    // all-day: YYYYMMDD
    return new Date(
      `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}T00:00:00Z`
    );
  }
  // datetime: 20240101T120000Z
  const iso = `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}T${str.slice(9, 11)}:${str.slice(11, 13)}:${str.slice(13, 15)}Z`;
  return new Date(iso);
}

/** Build calendar home set response for PROPFIND on principal */
export function buildPrincipalResponse(
  href: string,
  userId: string,
  displayName: string
): string {
  const calendarHome = `/api/caldav/${userId}/`;
  return multiStatus([
    davResponse(href, [
      propStat("200 OK", `
        <D:displayname>${escapeXml(displayName)}</D:displayname>
        <D:resourcetype><D:principal/></D:resourcetype>
        <C:calendar-home-set><D:href>${escapeXml(calendarHome)}</D:href></C:calendar-home-set>
        <D:current-user-principal><D:href>${escapeXml(href)}</D:href></D:current-user-principal>
      `),
    ]),
  ]);
}

/** Build calendar collection response for PROPFIND on calendar */
export function buildCalendarResponse(
  href: string,
  calendarName: string,
  calendarDescription: string,
  color: string,
  ctag: string
): string {
  return multiStatus([
    davResponse(href, [
      propStat("200 OK", `
        <D:displayname>${escapeXml(calendarName)}</D:displayname>
        <D:resourcetype>
          <D:collection/>
          <C:calendar/>
        </D:resourcetype>
        <C:calendar-description>${escapeXml(calendarDescription)}</C:calendar-description>
        <CS:getctag xmlns:CS="http://calendarserver.org/ns/">${escapeXml(ctag)}</CS:getctag>
        <C:supported-calendar-component-set>
          <C:comp name="VEVENT"/>
        </C:supported-calendar-component-set>
        <D:supported-report-set>
          <D:supported-report><D:report><C:calendar-query/></D:report></D:supported-report>
          <D:supported-report><D:report><C:calendar-multiget/></D:report></D:supported-report>
        </D:supported-report-set>
        <ICAL:calendar-color xmlns:ICAL="http://apple.com/ns/ical/">${escapeXml(color)}</ICAL:calendar-color>
      `),
    ]),
  ]);
}

/** Build event response for REPORT */
export function buildEventResponse(
  href: string,
  etag: string,
  icsData: string
): string {
  return davResponse(href, [
    propStat("200 OK", `
      <D:getetag>${escapeXml(`"${etag}"`)}</D:getetag>
      <C:calendar-data>${escapeXml(icsData)}</C:calendar-data>
    `),
  ]);
}

/** Parse VCALENDAR/VEVENT from raw ICS string (minimal parser) */
export function parseICSEvent(icsText: string): {
  uid: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
} | null {
  const lines = icsText
    .replace(/\r\n /g, "") // unfold
    .replace(/\r\n\t/g, "") // unfold tab
    .split(/\r\n|\n/);

  const get = (key: string): string | null => {
    for (const line of lines) {
      // Match KEY:value or KEY;PARAM=...:value
      const match = line.match(new RegExp(`^${key}(?:;[^:]*)?:(.*)$`, "i"));
      if (match) return match[1].trim();
    }
    return null;
  };

  const uid = get("UID");
  const summary = get("SUMMARY");
  const dtstart = get("DTSTART");
  const dtend = get("DTEND");

  if (!uid || !summary || !dtstart) return null;

  const allDay = dtstart.length === 8; // YYYYMMDD = all day
  const startAt = fromCalDAVDate(dtstart);
  const endAt = dtend ? fromCalDAVDate(dtend) : startAt;

  return {
    uid,
    title: summary,
    description: get("DESCRIPTION"),
    location: get("LOCATION"),
    startAt,
    endAt,
    allDay,
  };
}
