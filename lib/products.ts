export const products = [
  {
    id: "maharashtra",
    name: "Maharashtra Wheat",
    short: "Maharashtra",
    pack: ["MAHARASHTRA", "WHEAT"],
    twoKg: 109,
    fiveKg: 249,
    note: "Everyday fresh wheat flour",
    detail: "Soft, reliable atta for daily rotis and phulkas. The everyday staple for the whole family.",
    tag: "Daily staple",
  },
  {
    id: "lokwan",
    name: "Lokwan Wheat",
    short: "Lokwan",
    pack: ["LOKWAN", "WHEAT"],
    twoKg: 129,
    fiveKg: 299,
    note: "A popular wheat variety",
    detail: "Bold grains that make a well-rounded dough. A popular choice in homes across Maharashtra.",
    tag: "Most loved",
  },
  {
    id: "sharbati",
    name: "MP Sihore Sharbati Wheat",
    short: "Sharbati",
    pack: ["MP SIHORE", "SHARBATI"],
    twoKg: 149,
    fiveKg: 349,
    note: "Premium wheat variety",
    detail: "Golden Sharbati grain from Sihore, Madhya Pradesh. Naturally sweet, with soft, fluffy rotis.",
    tag: "Premium",
  },
] as const;

export type Product = (typeof products)[number];
export type ProductId = Product["id"];
export type PackSize = 2 | 5;

export const GRIND_OPTIONS = ["Fine", "Medium", "Coarse"] as const;
export type Grind = (typeof GRIND_OPTIONS)[number];

/**
 * WhatsApp number that receives orders: country code + number, digits only (e.g. "919876543210").
 * Can be overridden at build time with the NEXT_PUBLIC_WHATSAPP_NUMBER env var (e.g. in Vercel settings).
 */
export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "918087020395").replace(/\D/g, "");

export const PAYMENT_METHODS = { cash: "Cash at delivery", upi: "UPI at delivery" } as const;

/** Areas we deliver to. Both share the 411045 pincode. */
export const SERVICE_AREA = { areas: ["Baner", "Mahalunge"], pincode: "411045", label: "Baner & Mahalunge" } as const;
export const DELIVERY_STRIKE_PRICE = 4;

export const findProduct = (id: string) => products.find((p) => p.id === id);

export const priceFor = (id: ProductId, kg: PackSize) => {
  const p = findProduct(id)!;
  return kg === 2 ? p.twoKg : p.fiveKg;
};

export const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;
