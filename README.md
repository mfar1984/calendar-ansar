# AnSar Calendar

Calendar system dengan sokongan **CalDAV** dan **ICS** — multi-user, share calendar, real-time push.

## Features

- Multi-user dengan registration/login
- Setiap user ada calendar sendiri, boleh share kepada user lain (read/write)
- ICS subscribe feed untuk Outlook, Google Calendar
- CalDAV server penuh untuk Apple Calendar, Thunderbird, DAVx⁵
- Outlook-style event editor dengan rich text (Tiptap), categories, reminders, recurrence
- Real-time push notifications (SSE)
- Day/Week/Month views dengan mini calendar

## Setup

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

App akan run di `http://localhost:3000`.

## Konfigurasi

Edit `.env`:

```
DATABASE_URL="mysql://root:root@localhost:3306/calendar"
JWT_SECRET="tukar-kepada-secret-yang-selamat"
```

## Custom server

Project ini guna **custom Node.js server** (`server.js`) yang wrap Next.js. Ini perlu sebab CalDAV protocol guna HTTP methods bukan-standard (`PROPFIND`, `REPORT`, `MKCALENDAR`) yang Next.js App Router tak support natively.

Custom server intercept method-method ni dan re-route melalui POST shim, tanpa breaking standard methods (`GET`, `POST`, `PUT`, `DELETE`).

## Deploy ke cPanel

1. Upload semua files (kecuali `node_modules`, `.next`)
2. Pada cPanel **Setup Node.js App**:
   - **Application root:** project folder
   - **Application URL:** domain anda
   - **Application startup file:** `server.js`
   - **Node version:** 20.x atau lebih baru
3. Klik **Run NPM Install**
4. Set environment variables (`DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`)
5. Run `npm run build` melalui SSH atau cPanel terminal
6. Klik **Start App**

## Share Links

Setiap calendar ada 3 jenis share link:

| Jenis | URL | Untuk |
|---|---|---|
| ICS Feed | `/api/feed/[token]` | Outlook, Google Calendar (subscribe, read-only) |
| WebCal | `webcal://domain/api/feed/[token]` | Apple Calendar (klik terus untuk subscribe) |
| CalDAV | `/api/caldav/[userId]/[calendarId]/` | Apple Calendar, Thunderbird, DAVx⁵ (full sync) |

### CalDAV setup di Apple Calendar / Thunderbird

- **Server URL:** `https://yourdomain.com/api/caldav/[userId]/`
- **Username:** email anda
- **Password:** password anda

## API Routes

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/calendars
POST   /api/calendars
GET    /api/calendars/[id]
PATCH  /api/calendars/[id]
DELETE /api/calendars/[id]

GET    /api/calendars/[id]/share
POST   /api/calendars/[id]/share
DELETE /api/calendars/[id]/share

GET    /api/calendars/[id]/events
POST   /api/calendars/[id]/events
PATCH  /api/calendars/[id]/events/[eventId]
DELETE /api/calendars/[id]/events/[eventId]

GET    /api/feed/[token]          ← ICS feed (public, no auth)
GET    /api/events-stream         ← SSE push notifications

CalDAV (via /api/caldav/[...path]):
OPTIONS, GET, HEAD, PUT, DELETE         (native methods)
PROPFIND, REPORT, MKCALENDAR, PROPPATCH (via custom server.js)
```

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Prisma 7** + MySQL (via `@prisma/adapter-mariadb`)
- **Tiptap** untuk rich text editor
- **Tailwind CSS v4**
- **JWT** untuk session
- **Node.js HTTP** untuk custom server
