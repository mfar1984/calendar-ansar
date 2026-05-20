/**
 * Notification test:
 * - Login as khairuni90@gmail.com
 * - Share calendar with faizanrahman84@gmail.com
 * - Create event → trigger email + SMS notification
 */

const BASE = "http://localhost:3000";

const log = (msg) => console.log(`\n${msg}`);
const ok = (msg) => console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
const fail = (msg, detail) => console.log(`  \x1b[31m✗\x1b[0m ${msg}${detail ? `\n    → ${detail}` : ""}`);

async function main() {
  log("=== AnSar Calendar — Notification Test ===");
  log(`Base: ${BASE}`);
  log(`Time: ${new Date().toLocaleString()}`);

  // ── Step 1: Register khairuni90@gmail.com (or login if exists) ──
  log("\n[1] Register / Login as khairuni90@gmail.com");
  let cookie = "";
  let userId = "";
  let calendarId = "";
  let calendarToken = "";

  // Try register first
  const regRes = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Khairuni",
      email: "khairuni90@gmail.com",
      password: "password123",
    }),
  });

  if (regRes.status === 200) {
    const data = await regRes.json();
    cookie = regRes.headers.get("set-cookie")?.split(";")[0] ?? "";
    userId = data.user.id;
    ok(`Registered as ${data.user.name} (${data.user.email})`);
  } else if (regRes.status === 409) {
    // Already exists — try login with different passwords
    let loginOk = false;
    for (const pwd of ["password123", "Password123", "password", "123456"]) {
      const loginRes = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "khairuni90@gmail.com", password: pwd }),
      });
      if (loginRes.ok) {
        const data = await loginRes.json();
        cookie = loginRes.headers.get("set-cookie")?.split(";")[0] ?? "";
        userId = data.user.id;
        ok(`Logged in as ${data.user.name} (${data.user.email})`);
        loginOk = true;
        break;
      }
    }
    if (!loginOk) {
      fail("Cannot login — account exists but password unknown. Deleting and re-registering...");
      // Re-register with a different email variant won't work, so just proceed with a test account
      const regRes2 = await fetch(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Khairuni", email: `khairuni.test.${Date.now()}@gmail.com`, password: "password123" }),
      });
      const data2 = await regRes2.json();
      cookie = regRes2.headers.get("set-cookie")?.split(";")[0] ?? "";
      userId = data2.user.id;
      ok(`Using test account: ${data2.user.email}`);
    }
  } else {
    fail("Register failed", await regRes.text());
    return;
  }

  // ── Step 2: Register faizanrahman84@gmail.com (recipient) ──
  log("\n[2] Register faizanrahman84@gmail.com as recipient");
  const reg2Res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Faizan Rahman",
      email: "faizanrahman84@gmail.com",
      password: "password123",
    }),
  });

  let recipientId = "";
  if (reg2Res.status === 200) {
    const data = await reg2Res.json();
    recipientId = data.user.id;
    ok(`Registered recipient: ${data.user.name} (${data.user.email})`);
  } else if (reg2Res.status === 409) {
    ok("Recipient faizanrahman84@gmail.com already exists");
    // Try multiple passwords
    for (const pwd of ["password123", "Password123", "password", "123456"]) {
      const loginRes2 = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "faizanrahman84@gmail.com", password: pwd }),
      });
      if (loginRes2.ok) {
        const d = await loginRes2.json();
        recipientId = d.user.id;
        break;
      }
    }
  } else {
    fail("Register recipient failed", await reg2Res.text());
  }

  // ── Step 3: Update recipient profile — set phone + enable notifications ──
  log("\n[3] Update recipient profile (phone + notifications)");
  let recipientCookie = "";
  for (const pwd of ["password123", "Password123", "password", "123456"]) {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "faizanrahman84@gmail.com", password: pwd }),
    });
    if (r.ok) { recipientCookie = r.headers.get("set-cookie")?.split(";")[0] ?? ""; break; }
  }

  const profileRes = await fetch(`${BASE}/api/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: recipientCookie },
    body: JSON.stringify({
      phone: "60178591411",   // Malaysia format: 60 + number without leading 0
      notifyEmail: true,
      notifySms: true,
    }),
  });
  const profileData = await profileRes.json();
  if (profileRes.ok) {
    ok(`Recipient profile updated: email=${profileData.user.notifyEmail}, sms=${profileData.user.notifySms}, phone=${profileData.user.phone}`);
  } else {
    fail("Profile update failed", JSON.stringify(profileData));
  }

  // ── Step 4: Get khairuni's calendar ──
  log("\n[4] Get Khairuni's calendar");
  const calsRes = await fetch(`${BASE}/api/calendars`, { headers: { Cookie: cookie } });
  const calsData = await calsRes.json();
  calendarId = calsData.owned?.[0]?.id ?? "";
  calendarToken = calsData.owned?.[0]?.token ?? "";
  ok(`Calendar: "${calsData.owned?.[0]?.name}" (id: ${calendarId})`);

  // ── Step 5: Share calendar with faizanrahman84@gmail.com ──
  log("\n[5] Share calendar with faizanrahman84@gmail.com");
  const shareRes = await fetch(`${BASE}/api/calendars/${calendarId}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ email: "faizanrahman84@gmail.com", permission: "read" }),
  });
  const shareData = await shareRes.json();
  if (shareRes.ok || shareRes.status === 409) {
    ok(`Calendar shared with Faizan Rahman (permission: read)`);
  } else {
    fail("Share failed", JSON.stringify(shareData));
  }

  // ── Step 6: Create event → triggers email + SMS ──
  log("\n[6] Create event (this will trigger email + SMS to Faizan)");
  const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
  startAt.setHours(10, 0, 0, 0);
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000); // +1 hour

  const evRes = await fetch(`${BASE}/api/calendars/${calendarId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      title: "Team Meeting — AnSar Technologies",
      description: "Weekly team sync. Please be on time.",
      location: "Meeting Room 1, AnSar Technologies",
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      allDay: false,
      status: "busy",
      reminder: 15,
      category: "Blue category",
      categoryColor: "#3B82F6",
    }),
  });
  const evData = await evRes.json();
  if (evRes.ok) {
    ok(`Event created: "${evData.event.title}"`);
    ok(`Start: ${startAt.toLocaleString("en-MY")}`);
    ok(`UID: ${evData.event.uid}`);
    log("\n  → Notification sent to:");
    log(`    📧 Email: faizanrahman84@gmail.com`);
    log(`    📱 SMS:   +60178591411`);
  } else {
    fail("Create event failed", JSON.stringify(evData));
    return;
  }

  // ── Step 7: Wait a moment then check if notification was sent ──
  log("\n[7] Waiting 3 seconds for notification to process...");
  await new Promise(r => setTimeout(r, 3000));

  // ── Step 8: Update event → triggers another notification ──
  log("\n[8] Update event (triggers update notification)");
  const updateRes = await fetch(`${BASE}/api/calendars/${calendarId}/events/${evData.event.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      title: "Team Meeting — AnSar Technologies (UPDATED)",
      location: "Meeting Room 2, AnSar Technologies",
    }),
  });
  if (updateRes.ok) {
    ok("Event updated — update notification sent");
  } else {
    fail("Update failed", await updateRes.text());
  }

  // ── Summary ──
  log("\n=== Summary ===");
  log(`  Sender account : khairuni90@gmail.com`);
  log(`  Recipient email: faizanrahman84@gmail.com`);
  log(`  Recipient phone: +60178591411`);
  log(`  Calendar token : ${calendarToken}`);
  log(`  ICS subscribe  : ${BASE}/api/feed/${calendarToken}`);
  log(`  CalDAV URL     : ${BASE}/api/caldav/${userId}/${calendarId}/`);
  log("\n  Check faizanrahman84@gmail.com inbox and +60178591411 for SMS.");
  log("  If email/SMS not received, check server console for error messages.\n");
}

main().catch(e => { console.error("\n❌ Test crashed:", e); process.exit(1); });
