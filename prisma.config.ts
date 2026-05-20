import "dotenv/config";
import { defineConfig } from "prisma/config";

// Support both DATABASE_URL (single var) and separate DB_* vars (cPanel style)
function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DB_HOST || "localhost";
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const name = process.env.DB_NAME;

  if (!user || !password || !name) {
    throw new Error("Database credentials missing. Set DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME");
  }

  // Encode special characters in password for URL safety
  const encodedPassword = encodeURIComponent(password);

  return `mysql://${user}:${encodedPassword}@${host}:3306/${name}`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getDatabaseUrl(),
  },
});
