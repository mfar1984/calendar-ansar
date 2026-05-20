# Test Report — AnSar Calendar

**Date:** 5/18/2026, 10:46:09 PM
**Base URL:** http://localhost:3000

## Summary

| Status | Count |
|---|---|
| ✅ Passed | 51 |
| ❌ Failed | 0 |
| **Total** | **51** |
| Pass rate | **100.0%** |

## Detailed Results


### 1. Authentication

| | Test |
|---|---|
| ✅ | Register new user |
| ✅ | Get current session (auth/me) |
| ✅ | Login with correct password |
| ✅ | Reject login with wrong password |

### 2. Calendar Management

| | Test |
|---|---|
| ✅ | Default calendar created on register |
| ✅ | Create new calendar |
| ✅ | Update calendar |
| ✅ | List calendars (now 2 owned) |

### 3. Calendar Sharing

| | Test |
|---|---|
| ✅ | Register second user (for sharing) |
| ✅ | Share calendar with another user (read) |
| ✅ | Reject share with non-existent user |
| ✅ | List calendar shares |

### 4. Events

| | Test |
|---|---|
| ✅ | Create event with full fields |
| ✅ | Update event |
| ✅ | List events |
| ✅ | Create recurring event |

### 5. ICS Feed (Outlook / Google Calendar)

| | Test |
|---|---|
| ✅ | ICS feed accessible (public, no auth) |
| ✅ | ICS Content-Type is text/calendar |
| ✅ | ICS contains BEGIN:VCALENDAR |
| ✅ | ICS contains END:VCALENDAR |
| ✅ | ICS contains VERSION:2.0 |
| ✅ | ICS contains PRODID |
| ✅ | ICS contains BEGIN:VEVENT |
| ✅ | ICS contains UID |
| ✅ | ICS contains DTSTART |
| ✅ | ICS contains DTEND |
| ✅ | ICS contains SUMMARY |
| ✅ | ICS contains LOCATION |
| ✅ | ICS contains DESCRIPTION |
| ✅ | ICS contains DTSTAMP (RFC 5545 required) |
| ✅ | Invalid ICS token returns 404 |

### 6. CalDAV Protocol (Apple Calendar / Thunderbird)

| | Test |
|---|---|
| ✅ | OPTIONS returns 200 |
| ✅ | OPTIONS Allow header includes PROPFIND |
| ✅ | OPTIONS Allow header includes REPORT |
| ✅ | OPTIONS DAV header includes calendar-access |
| ✅ | PROPFIND without auth returns 401 |
| ✅ | 401 includes WWW-Authenticate header |
| ✅ | PROPFIND with Basic auth returns 207 |
| ✅ | PROPFIND response is XML |
| ✅ | PROPFIND lists user calendars |
| ✅ | PROPFIND includes ctag (CalendarServer extension) |
| ✅ | PROPFIND on specific calendar returns 207 |
| ✅ | REPORT calendar-query returns 207 |
| ✅ | REPORT response includes calendar-data |
| ✅ | REPORT response includes etag |
| ✅ | PUT creates event via CalDAV |
| ✅ | PUT response includes ETag |
| ✅ | GET fetches single event ICS |
| ✅ | DELETE removes event via CalDAV |

### 7. Authorization

| | Test |
|---|---|
| ✅ | Reject unauthenticated calendar list |
| ✅ | Reject CalDAV with wrong password |

## What Each Section Means

- **Authentication** — User registration, login, session management.
- **Calendar Management** — Create, update, list calendars.
- **Calendar Sharing** — Share calendar with other users (read/write permissions).
- **Events** — CRUD operations including recurring events with categories, reminders.
- **ICS Feed** — Read-only calendar feed for Outlook, Google Calendar subscribe URL.
- **CalDAV Protocol** — Full two-way sync protocol for Apple Calendar, Thunderbird, DAVx⁵.
- **Authorization** — Verifies endpoints reject unauthorized requests.

## Notes

- CalDAV uses non-standard HTTP methods (`PROPFIND`, `REPORT`, `MKCALENDAR`) which Next.js App Router does not natively support.
- Project uses a custom Node.js server (`server.js`) that intercepts these methods and routes them via a POST shim, while preserving standard methods.
- ICS feed is RFC 5545 compliant (includes `VERSION:2.0`, `PRODID`, `DTSTAMP`).