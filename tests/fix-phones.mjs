import * as mariadb from "mariadb";

const pool = mariadb.createPool({
  host: "localhost", user: "root", password: "root", database: "calendar",
});

// Get all users with phone numbers
const users = await pool.query("SELECT id, name, email, phone FROM `User` WHERE phone IS NOT NULL");

console.log("Current phone numbers:");
for (const u of users) {
  let fixed = u.phone.trim().replace(/\s+/g, "").replace(/-/g, "");
  if (fixed.startsWith("+")) fixed = fixed.slice(1);
  else if (fixed.startsWith("0")) fixed = "6" + fixed;

  const changed = fixed !== u.phone;
  console.log(`  ${u.name} (${u.email}): ${u.phone} → ${fixed} ${changed ? "✓ FIXED" : "(no change)"}`);

  if (changed) {
    await pool.query("UPDATE `User` SET phone = ? WHERE id = ?", [fixed, u.id]);
  }
}

console.log("\nDone.");
await pool.end();
