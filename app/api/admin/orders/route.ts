import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200);
  return NextResponse.json({ orders: rows }, { headers: { "Cache-Control": "private, no-store" } });
}
