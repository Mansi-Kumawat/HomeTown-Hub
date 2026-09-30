// GET /api/health — uptime probe. Also proves the database connection works.
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ok, fail } from "@/lib/http";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return ok({ status: "ok", database: "connected", time: new Date().toISOString() }, "Healthy");
  } catch {
    return fail("Database connection failed", 500);
  }
}
