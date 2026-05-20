// Quick test to verify SMS format and character count

function buildSmsMessage(type, params) {
  const formatTime = (d) =>
    d.toLocaleString("en-MY", {
      day: "numeric", month: "short", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    }).replace(",", "");

  const start = params.startAt ? formatTime(params.startAt) : "";
  const end = params.endAt ? formatTime(params.endAt).replace(/^\d+ \w+ \d+ /, "") : "";
  const at = params.location ? ` at ${params.location}` : "";

  let msg = "";
  if (type === "created") {
    msg = `[${params.calendarName}] : "${params.eventTitle}" on ${start} to ${end}${at}. by ${params.byName}`;
  } else if (type === "updated") {
    msg = `[${params.calendarName}] Updated: "${params.eventTitle}" on ${start} to ${end}${at}. by ${params.byName}`;
  } else {
    msg = `[${params.calendarName}] Cancelled: "${params.eventTitle}". by ${params.byName}`;
  }

  if (msg.length <= 160) return msg;

  const overhead = msg.length - params.eventTitle.length;
  const maxTitle = 160 - overhead - 3;
  const shortTitle = maxTitle > 5 ? params.eventTitle.slice(0, maxTitle) + "..." : params.eventTitle.slice(0, 10) + "...";

  if (type === "created") {
    msg = `[${params.calendarName}] : "${shortTitle}" on ${start} to ${end}${at}. by ${params.byName}`;
  } else if (type === "updated") {
    msg = `[${params.calendarName}] Updated: "${shortTitle}" on ${start} to ${end}${at}. by ${params.byName}`;
  } else {
    msg = `[${params.calendarName}] Cancelled: "${shortTitle}". by ${params.byName}`;
  }

  return msg.slice(0, 160);
}

const start = new Date("2026-05-19T10:00:00");
const end = new Date("2026-05-19T12:00:00");

const tests = [
  { type: "created",  title: "Team Meeting — AnSar Technologies", cal: "Khairunnisa's Calendar", loc: "Meeting Room 1, AnSar Technologies", by: "Khairunnisa" },
  { type: "updated",  title: "Team Meeting — AnSar Technologies (UPDATED)", cal: "Khairunnisa's Calendar", loc: "Meeting Room 2", by: "Khairunnisa" },
  { type: "deleted",  title: "Team Meeting — AnSar Technologies", cal: "Khairunnisa's Calendar", loc: null, by: "Khairunnisa" },
  { type: "created",  title: "Short", cal: "Work", loc: null, by: "Ali" },
  { type: "created",  title: "A Very Long Event Title That Might Exceed The Character Limit When Combined With Other Fields", cal: "Khairunnisa's Calendar", loc: "Conference Room A, Level 3, AnSar Technologies HQ", by: "Khairunnisa Binti Ahmad" },
];

console.log("SMS Format Test\n" + "=".repeat(60));
for (const t of tests) {
  const msg = buildSmsMessage(t.type, {
    eventTitle: t.title,
    calendarName: t.cal,
    startAt: t.type !== "deleted" ? start : undefined,
    endAt: t.type !== "deleted" ? end : undefined,
    location: t.loc,
    byName: t.by,
  });
  const ok = msg.length <= 160;
  console.log(`\n[${t.type.toUpperCase()}] ${ok ? "✓" : "✗ OVER LIMIT"} (${msg.length} chars)`);
  console.log(`"${msg}"`);
}
