import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Guests look up an order with its Order ID plus the mobile number used to place it.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "").trim();
  const phone = String(body?.phone ?? "").replace(/\D/g, "").slice(-10);
  if (!UUID.test(id) || phone.length !== 10) {
    return NextResponse.json({ error: "Enter your full Order ID and 10-digit mobile number." }, { status: 400 });
  }
  const [order] = await db
    .select({
      id: orders.id,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      items: orders.items,
      total: orders.total,
      paymentMethod: orders.paymentMethod,
      status: orders.status,
    })
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.phone, phone)))
    .limit(1);
  if (!order) return NextResponse.json({ error: "No order found for that Order ID and mobile number." }, { status: 404 });
  return NextResponse.json({ order });
}
