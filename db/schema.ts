import { pgTable, uuid, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export type OrderAddress = {
  name: string;
  phone: string;
  flat: string;
  society: string;
  street: string;
  area: string;
  pincode: string;
};

export type OrderItem = {
  productId: string;
  productName: string;
  kg: number;
  quantity: number;
  unitPrice: number;
  grinding: string;
  note: string;
};

export const orders = pgTable(
  "orders",
  {
    id: uuid().primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    customerName: text("customer_name").notNull(),
    phone: text().notNull(),
    address: jsonb().$type<OrderAddress>().notNull(),
    items: jsonb().$type<OrderItem[]>().notNull(),
    subtotal: integer().notNull(),
    deliveryCharge: integer("delivery_charge").notNull().default(0),
    total: integer().notNull(),
    paymentMethod: text("payment_method").notNull(),
    status: text().notNull().default("New"),
  },
  (t) => [index("orders_created_at_idx").on(t.createdAt), index("orders_status_idx").on(t.status)],
);
