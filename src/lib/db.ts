import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

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

  const encodedPassword = encodeURIComponent(password);
  return `mysql://${user}:${encodedPassword}@${host}:3306/${name}`;
}

function createPrismaClient() {
  const dbUrl = getDatabaseUrl();
  const u = new URL(dbUrl);

  const adapter = new PrismaMariaDb({
    host: u.hostname,
    port: u.port ? parseInt(u.port) : 3306,
    user: u.username,
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    connectionLimit: 10,
  });

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
