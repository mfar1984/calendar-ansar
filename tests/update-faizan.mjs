import * as mariadb from "mariadb";

const pool = mariadb.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "calendar",
});

const result = await pool.query(
  "UPDATE `User` SET phone = ?, notifyEmail = 1, notifySms = 1 WHERE email = ?",
  ["60178591411", "faizanrahman84@gmail.com"]
);

console.log("Updated rows:", result.affectedRows);

// Verify
const rows = await pool.query(
  "SELECT id, name, email, phone, notifyEmail, notifySms FROM `User` WHERE email = ?",
  ["faizanrahman84@gmail.com"]
);
console.log("Faizan profile:", rows[0]);

await pool.end();
