export const products = [
  {
    id: "maharashtra",
    name: "Maharashtra Wheat",
    short: "Maharashtra",
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

export const ORDER_STATUSES = ["New", "Confirmed", "Grinding", "Out for Delivery", "Delivered", "Cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = { cash: "Cash at delivery", upi: "UPI at delivery" } as const;

export const SERVICE_AREA = { area: "Mahalunge", pincode: "411045" };
export const DELIVERY_STRIKE_PRICE = 4;

export const findProduct = (id: string) => products.find((p) => p.id === id);

export const priceFor = (id: ProductId, kg: PackSize) => {
  const p = findProduct(id)!;
  return kg === 2 ? p.twoKg : p.fiveKg;
};

export const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;
