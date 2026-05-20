/**
 * End-to-end test suite for AnSar Calendar
 * Tests all API endpoints, ICS feed, and CalDAV protocol compliance.
 *
 * Usage:
 *   1. Make sure server is running: npm run dev
 *   2. Run: node tests/run-tests.mjs
 *
 * Output: Pretty-printed test results to console + tests/test-report.md
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.TEST_BASE || "http://localhost:3000";

const results = [];
let passed = 0;
let failed = 0;

const ANSI = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function record(name, ok, details = "") {
  results.push({ name, ok, details });
  if (ok) {
    passed++;
    console.log(`${ANSI.green}✓${ANSI.reset} ${name}`);
  } else {
    failed++;
    console.log(`${ANSI.red}✗${ANSI.reset} ${name}`);
    if (details) console.log(`  ${ANSI.gray}${details}${ANSI.reset}`);
  }
}

function section(title) {
  console.log(`\n${ANSI.bold}${ANSI.blue}━━ ${title} ━━${ANSI.reset}`);
  results.push({ section: title });
}

async function main() {
  console.log(`${ANSI.bold}AnSar Calendar — End-to-End Test Suite${ANSI.reset}`);
  console.log(`${ANSI.gray}Base URL: ${BASE}${ANSI.reset}`);
  console.log(`${ANSI.gray}Started: ${new Date().toLocaleString()}${ANSI.reset}`);

  const ts = Date.now();
  const email = `test${ts}@example.com`;
  const password = "password123";
  let cookie = "";
  let userId = "";
  let calendarId = "";
  let calendarToken = "";
  let eventId = "";
  let eventUid = "";

  // ════════════════════════════════════════════
  section("1. Authentication");
  // ════════════════════════════════════════════
  try {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test User", email, password }),
    });
    const data = await res.json();
    cookie = res.headers.get("set-cookie")?.split(";")[0] ?? "";
    userId = data.user?.id ?? "";
    record("Register new user", res.status === 200 && !!data.user?.id,
      res.status !== 200 ? `status=${res.status}, body=${JSON.stringify(data)}` : "");
  } catch (e) { record("Register new user", false, String(e)); }

  try {
    const res = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: cookie } });
    const data = await res.json();
    record("Get current session (auth/me)", res.status === 200 && data.user?.email === email);
  } catch (e) { record("Get current session (auth/me)", false, String(e)); }

  try {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    record("Login with correct password", res.status === 200);
  } catch (e) { record("Login with correct password", false, String(e)); }

  try {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "wrong-password" }),
    });
    record("Reject login with wrong password", res.status === 401);
  } catch (e) { record("Reject login with wrong password", false, String(e)); }

  // ════════════════════════════════════════════
  section("2. Calendar Management");
  // ════════════════════════════════════════════
  try {
    const res = await fetch(`${BASE}/api/calendars`, { headers: { Cookie: cookie } });
    const data = await res.json();
    calendarId = data.owned?.[0]?.id ?? "";
    calendarToken = data.owned?.[0]?.token ?? "";
    record("Default calendar created on register", res.status === 200 && data.owned?.length === 1);
  } catch (e) { record("Default calendar created on register", false, String(e)); }

  try {
    const res = await fetch(`${BASE}/api/calendars`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "Work", description: "Work events", color: "#EF4444" }),
    });
    const data = await res.json();
    record("Create new calendar", res.status === 201 && data.calendar?.name === "Work");
  } catch (e) { record("Create new calendar", false, String(e)); }

  try {
    const res = await fetch(`${BASE}/api/calendars/${calendarId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ description: "Updated description" }),
    });
    const data = await res.json();
    record("Update calendar", res.status === 200 && data.calendar?.description === "Updated description");
  } catch (e) { record("Update calendar", false, String(e)); }

  try {
    const res = await fetch(`${BASE}/api/calendars`, { headers: { Cookie: cookie } });
    const data = await res.json();
    record("List calendars (now 2 owned)", res.status === 200 && data.owned?.length === 2);
  } catch (e) { record("List calendars (now 2 owned)", false, String(e)); }

  // ════════════════════════════════════════════
  section("3. Calendar Sharing");
  // ════════════════════════════════════════════
  const otherEmail = `other${ts}@example.com`;
  try {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Other User", email: otherEmail, password }),
    });
    record("Register second user (for sharing)", res.status === 200);
  } catch (e) { record("Register second user (for sharing)", false, String(e)); }

  try {
    const res = await fetch(`${BASE}/api/calendars/${calendarId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ email: otherEmail, permission: "read" }),
    });
    record("Share calendar with another user (read)", res.status === 201);
  } catch (e) { record("Share calendar with another user (read)", false, String(e)); }

  try {
    const res = await fetch(`${BASE}/api/calendars/${calendarId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ email: "noexist@example.com", permission: "read" }),
    });
    record("Reject share with non-existent user", res.status === 404);
  } catch (e) { record("Reject share with non-existent user", false, String(e)); }

  try {
    const res = await fetch(`${BASE}/api/calendars/${calendarId}/share`, {
      headers: { Cookie: cookie },
    });
    const data = await res.json();
    record("List calendar shares", res.status === 200 && data.shares?.length === 1);
  } catch (e) { record("List calendar shares", false, String(e)); }

  // ════════════════════════════════════════════
  section("4. Events");
  // ════════════════════════════════════════════
  const startAt = new Date(Date.now() + 60 * 60 * 1000);
  const endAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  try {
    const res = await fetch(`${BASE}/api/calendars/${calendarId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        title: "Team Meeting",
        description: "Weekly sync",
        location: "Conference Room A",
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        allDay: false,
        status: "busy",
        reminder: 15,
        category: "Blue category",
        categoryColor: "#3B82F6",
        isPrivate: false,
      }),
    });
    const data = await res.json();
    eventId = data.event?.id ?? "";
    eventUid = data.event?.uid ?? "";
    record("Create event with full fields", res.status === 201 && !!data.event?.uid);
  } catch (e) { record("Create event with full fields", false, String(e)); }

  try {
    const res = await fetch(`${BASE}/api/calendars/${calendarId}/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ title: "Team Meeting (Updated)", reminder: 30 }),
    });
    const data = await res.json();
    record("Update event", res.status === 200 && data.event?.title === "Team Meeting (Updated)" && data.event?.reminder === 30);
  } catch (e) { record("Update event", false, String(e)); }

  try {
    const res = await fetch(`${BASE}/api/calendars/${calendarId}/events`, {
      headers: { Cookie: cookie },
    });
    const data = await res.json();
    record("List events", res.status === 200 && data.events?.length === 1);
  } catch (e) { record("List events", false, String(e)); }

  try {
    const recRes = await fetch(`${BASE}/api/calendars/${calendarId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        title: "Weekly Standup",
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        recurrence: { type: "weekly", interval: 1, daysOfWeek: [1], endType: "never" },
      }),
    });
    const data = await recRes.json();
    record("Create recurring event", recRes.status === 201 && !!data.event?.recurrence);
  } catch (e) { record("Create recurring event", false, String(e)); }

  // ════════════════════════════════════════════
  section("5. ICS Feed (Outlook / Google Calendar)");
  // ════════════════════════════════════════════
  let icsText = "";
  try {
    const res = await fetch(`${BASE}/api/feed/${calendarToken}`);
    icsText = await res.text();
    record("ICS feed accessible (public, no auth)", res.status === 200);
    record("ICS Content-Type is text/calendar", res.headers.get("content-type")?.includes("text/calendar"));
  } catch (e) { record("ICS feed accessible", false, String(e)); }

  record("ICS contains BEGIN:VCALENDAR", icsText.includes("BEGIN:VCALENDAR"));
  record("ICS contains END:VCALENDAR", icsText.includes("END:VCALENDAR"));
  record("ICS contains VERSION:2.0", icsText.includes("VERSION:2.0"));
  record("ICS contains PRODID", /PRODID:/.test(icsText));
  record("ICS contains BEGIN:VEVENT", icsText.includes("BEGIN:VEVENT"));
  record("ICS contains UID", /UID:[^\r\n]+/.test(icsText));
  record("ICS contains DTSTART", /DTSTART/.test(icsText));
  record("ICS contains DTEND", /DTEND/.test(icsText));
  record("ICS contains SUMMARY", /SUMMARY:[^\r\n]+/.test(icsText));
  record("ICS contains LOCATION", icsText.includes("LOCATION:Conference Room A"));
  record("ICS contains DESCRIPTION", icsText.includes("DESCRIPTION:Weekly sync"));
  record("ICS contains DTSTAMP (RFC 5545 required)", /DTSTAMP/.test(icsText));

  try {
    const res = await fetch(`${BASE}/api/feed/invalid-token-xxxx`);
    record("Invalid ICS token returns 404", res.status === 404);
  } catch (e) { record("Invalid ICS token returns 404", false, String(e)); }

  // ════════════════════════════════════════════
  section("6. CalDAV Protocol (Apple Calendar / Thunderbird)");
  // ════════════════════════════════════════════
  const basicAuth = "Basic " + Buffer.from(`${email}:${password}`).toString("base64");

  try {
    const res = await fetch(`${BASE}/api/caldav/${userId}/`, { method: "OPTIONS" });
    record("OPTIONS returns 200", res.status === 200);
    record("OPTIONS Allow header includes PROPFIND", res.headers.get("allow")?.includes("PROPFIND"));
    record("OPTIONS Allow header includes REPORT", res.headers.get("allow")?.includes("REPORT"));
    record("OPTIONS DAV header includes calendar-access", res.headers.get("dav")?.includes("calendar-access"));
  } catch (e) { record("OPTIONS request", false, String(e)); }

  try {
    const res = await fetch(`${BASE}/api/caldav/${userId}/`, { method: "PROPFIND" });
    record("PROPFIND without auth returns 401", res.status === 401);
    record("401 includes WWW-Authenticate header", res.headers.get("www-authenticate")?.includes("Basic"));
  } catch (e) { record("PROPFIND without auth", false, String(e)); }

  try {
    const res = await fetch(`${BASE}/api/caldav/${userId}/`, {
      method: "PROPFIND",
      headers: { Authorization: basicAuth, Depth: "1" },
    });
    const text = await res.text();
    record("PROPFIND with Basic auth returns 207", res.status === 207);
    record("PROPFIND response is XML", res.headers.get("content-type")?.includes("xml"));
    record("PROPFIND lists user calendars", text.includes("<C:calendar") || text.includes("calendar"));
    record("PROPFIND includes ctag (CalendarServer extension)", text.includes("getctag"));
  } catch (e) { record("PROPFIND with auth", false, String(e)); }

  try {
    const res = await fetch(`${BASE}/api/caldav/${userId}/${calendarId}/`, {
      method: "PROPFIND",
      headers: { Authorization: basicAuth, Depth: "0" },
    });
    record("PROPFIND on specific calendar returns 207", res.status === 207);
  } catch (e) { record("PROPFIND on calendar", false, String(e)); }

  try {
    const reportBody = `<?xml version="1.0" encoding="UTF-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><D:getetag/><C:calendar-data/></D:prop>
  <C:filter><C:comp-filter name="VCALENDAR"><C:comp-filter name="VEVENT"/></C:comp-filter></C:filter>
</C:calendar-query>`;
    const res = await fetch(`${BASE}/api/caldav/${userId}/${calendarId}/`, {
      method: "REPORT",
      headers: { Authorization: basicAuth, "Content-Type": "application/xml" },
      body: reportBody,
    });
    const text = await res.text();
    record("REPORT calendar-query returns 207", res.status === 207);
    record("REPORT response includes calendar-data", text.includes("calendar-data"));
    record("REPORT response includes etag", text.includes("getetag"));
  } catch (e) { record("REPORT calendar-query", false, String(e)); }

  // CalDAV PUT — create event via CalDAV (simulating Apple Calendar adding event)
  const newUid = `caldav-test-${Date.now()}@calendar.ansartechnologies.my`;
  try {
    const newIcs = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Test//Test//EN\r\nBEGIN:VEVENT\r\nUID:${newUid}\r\nSUMMARY:CalDAV Created\r\nDTSTART:20260520T100000Z\r\nDTEND:20260520T110000Z\r\nEND:VEVENT\r\nEND:VCALENDAR`;
    const res = await fetch(`${BASE}/api/caldav/${userId}/${calendarId}/${newUid}.ics`, {
      method: "PUT",
      headers: { Authorization: basicAuth, "Content-Type": "text/calendar" },
      body: newIcs,
    });
    record("PUT creates event via CalDAV", res.status === 201);
    record("PUT response includes ETag", !!res.headers.get("etag"));
  } catch (e) { record("PUT creates event", false, String(e)); }

  try {
    const res = await fetch(`${BASE}/api/caldav/${userId}/${calendarId}/${newUid}.ics`, {
      headers: { Authorization: basicAuth },
    });
    const text = await res.text();
    record("GET fetches single event ICS", res.status === 200 && text.includes(newUid));
  } catch (e) { record("GET single event", false, String(e)); }

  try {
    const res = await fetch(`${BASE}/api/caldav/${userId}/${calendarId}/${newUid}.ics`, {
      method: "DELETE",
      headers: { Authorization: basicAuth },
    });
    record("DELETE removes event via CalDAV", res.status === 204);
  } catch (e) { record("DELETE event", false, String(e)); }

  // ════════════════════════════════════════════
  section("7. Authorization");
  // ════════════════════════════════════════════
  try {
    const res = await fetch(`${BASE}/api/calendars`);
    record("Reject unauthenticated calendar list", res.status === 401);
  } catch (e) { record("Reject unauthenticated calendar list", false, String(e)); }

  try {
    const res = await fetch(`${BASE}/api/caldav/${userId}/${calendarId}/`, {
      method: "PROPFIND",
      headers: { Authorization: "Basic " + Buffer.from(`${email}:wrong`).toString("base64") },
    });
    record("Reject CalDAV with wrong password", res.status === 401);
  } catch (e) { record("Reject CalDAV with wrong password", false, String(e)); }

  // ════════════════════════════════════════════
  // Summary + write report
  // ════════════════════════════════════════════
  console.log(`\n${ANSI.bold}━━━ Summary ━━━${ANSI.reset}`);
  console.log(`${ANSI.green}Passed: ${passed}${ANSI.reset}`);
  console.log(`${ANSI.red}Failed: ${failed}${ANSI.reset}`);
  const total = passed + failed;
  const pct = ((passed / total) * 100).toFixed(1);
  console.log(`${ANSI.bold}Total:  ${total} (${pct}%)${ANSI.reset}`);

  // Write markdown report
  const lines = [];
  lines.push("# Test Report — AnSar Calendar");
  lines.push("");
  lines.push(`**Date:** ${new Date().toLocaleString()}`);
  lines.push(`**Base URL:** ${BASE}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Status | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| ✅ Passed | ${passed} |`);
  lines.push(`| ❌ Failed | ${failed} |`);
  lines.push(`| **Total** | **${total}** |`);
  lines.push(`| Pass rate | **${pct}%** |`);
  lines.push("");
  lines.push("## Detailed Results");
  lines.push("");

  for (const r of results) {
    if (r.section) {
      lines.push("");
      lines.push(`### ${r.section}`);
      lines.push("");
      lines.push("| | Test |");
      lines.push("|---|---|");
    } else {
      const icon = r.ok ? "✅" : "❌";
      lines.push(`| ${icon} | ${r.name}${r.details ? ` — _${r.details}_` : ""} |`);
    }
  }

  lines.push("");
  lines.push("## What Each Section Means");
  lines.push("");
  lines.push("- **Authentication** — User registration, login, session management.");
  lines.push("- **Calendar Management** — Create, update, list calendars.");
  lines.push("- **Calendar Sharing** — Share calendar with other users (read/write permissions).");
  lines.push("- **Events** — CRUD operations including recurring events with categories, reminders.");
  lines.push("- **ICS Feed** — Read-only calendar feed for Outlook, Google Calendar subscribe URL.");
  lines.push("- **CalDAV Protocol** — Full two-way sync protocol for Apple Calendar, Thunderbird, DAVx⁵.");
  lines.push("- **Authorization** — Verifies endpoints reject unauthorized requests.");
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- CalDAV uses non-standard HTTP methods (`PROPFIND`, `REPORT`, `MKCALENDAR`) which Next.js App Router does not natively support.");
  lines.push("- Project uses a custom Node.js server (`server.js`) that intercepts these methods and routes them via a POST shim, while preserving standard methods.");
  lines.push("- ICS feed is RFC 5545 compliant (includes `VERSION:2.0`, `PRODID`, `DTSTAMP`).");

  const reportPath = join(__dirname, "test-report.md");
  writeFileSync(reportPath, lines.join("\n"), "utf-8");
  console.log(`\n${ANSI.gray}Report written to: ${reportPath}${ANSI.reset}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(`${ANSI.red}Test runner crashed:${ANSI.reset}`, e);
  process.exit(1);
});
