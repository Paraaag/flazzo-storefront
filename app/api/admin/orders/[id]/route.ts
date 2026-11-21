import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { ORDER_STATUSES } from "@/lib/products";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!(ORDER_STATUSES as readonly string[]).includes(body?.status)) {
    return NextResponse.json({ error: "Unknown status." }, { status: 400 });
  }
  const [row] = await db
    .update(orders)
    .set({ status: body.status, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning({ id: orders.id, status: orders.status, updatedAt: orders.updatedAt });
  if (!row) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ order: row });
}
