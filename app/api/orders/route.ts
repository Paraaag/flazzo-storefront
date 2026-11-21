import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, type OrderAddress, type OrderItem } from "@/db/schema";
import { findProduct, priceFor, GRIND_OPTIONS, PAYMENT_METHODS, type ProductId, type PackSize } from "@/lib/products";

const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const a = body?.address ?? {};
  const address: OrderAddress = {
    name: clean(a.name, 100),
    phone: clean(a.phone, 20).replace(/\D/g, "").slice(-10),
    flat: clean(a.flat, 80),
    society: clean(a.society, 120),
    street: clean(a.street, 240),
    area: clean(a.area, 80),
    pincode: clean(a.pincode, 10).replace(/\D/g, ""),
  };

  const fieldErrors: Record<string, string> = {};
  if (address.name.length < 2) fieldErrors.name = "Please enter your full name.";
  if (!/^[6-9]\d{9}$/.test(address.phone)) fieldErrors.phone = "Enter a valid 10-digit mobile number.";
  if (!address.flat) fieldErrors.flat = "Flat or house number is required.";
  if (!address.society) fieldErrors.society = "Society or building is required.";
  if (!address.street) fieldErrors.street = "Road or full address is required.";
  if (!address.area) fieldErrors.area = "Area is required.";
  if (!/^\d{6}$/.test(address.pincode)) fieldErrors.pincode = "Enter a 6-digit pincode.";
  if (Object.keys(fieldErrors).length) {
    return NextResponse.json({ error: "Please check your delivery details.", fieldErrors }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }
  if (body.items.length > 20) {
    return NextResponse.json({ error: "Too many items in one order." }, { status: 400 });
  }

  let items: OrderItem[];
  try {
    items = body.items.map((x: any) => {
      const product = findProduct(x?.id);
      const kg = Number(x?.kg);
      const qty = Number(x?.qty);
      if (!product || (kg !== 2 && kg !== 5) || !Number.isInteger(qty) || qty < 1 || qty > 30) {
        throw new Error("invalid");
      }
      const grinding = (GRIND_OPTIONS as readonly string[]).includes(x?.grind) ? x.grind : "Medium";
      return {
        productId: product.id,
        productName: product.name,
        kg,
        quantity: qty,
        // Prices always come from the server-side catalogue, never from the browser.
        unitPrice: priceFor(product.id as ProductId, kg as PackSize),
        grinding,
        note: clean(x?.note, 500),
      };
    });
  } catch {
    return NextResponse.json({ error: "One of the items in your cart is no longer valid." }, { status: 400 });
  }

  const subtotal = items.reduce((s, x) => s + x.unitPrice * x.quantity, 0);
  const paymentMethod = body.payment_method === "cash" ? PAYMENT_METHODS.cash : PAYMENT_METHODS.upi;

  try {
    const [order] = await db
      .insert(orders)
      .values({
        customerName: address.name,
        phone: address.phone,
        address,
        items,
        subtotal,
        deliveryCharge: 0,
        total: subtotal,
        paymentMethod,
        status: "New",
      })
      .returning({ id: orders.id, createdAt: orders.createdAt, total: orders.total });
    return NextResponse.json({ order }, { status: 201 });
  } catch (e) {
    console.error("Order insert failed", e);
    return NextResponse.json({ error: "We couldn't place your order right now. Please try again." }, { status: 500 });
  }
}
