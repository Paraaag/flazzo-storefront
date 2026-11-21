"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ShoppingBag,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  X,
  MapPin,
  Search,
  Banknote,
  Smartphone,
  Truck,
  Wheat,
  Cog,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import {
  products,
  priceFor,
  money,
  GRIND_OPTIONS,
  SERVICE_AREA,
  DELIVERY_STRIKE_PRICE,
  type ProductId,
  type PackSize,
  type Grind,
} from "@/lib/products";
import { FlourBag } from "./FlourBag";
import { GrainTexture } from "./GrainTexture";

type Line = { id: ProductId; kg: PackSize; qty: number; grind: Grind; note: string };
type Address = { name: string; phone: string; flat: string; society: string; street: string; area: string; pincode: string };
type Step = "closed" | "cart" | "details" | "done";
type SavedOrder = { id: string; phone: string; total: number; createdAt: string };
type TrackedOrder = {
  id: string;
  createdAt: string;
  updatedAt: string;
  items: { productName: string; kg: number; quantity: number; grinding: string }[];
  total: number;
  paymentMethod: string;
  status: string;
};

const emptyAddress: Address = { name: "", phone: "", flat: "", society: "", street: "", area: SERVICE_AREA.area, pincode: SERVICE_AREA.pincode };
const CART_KEY = "flazzo_cart_v1";
const ORDERS_KEY = "flazzo_guest_orders";

const fieldLabels: Record<keyof Address, string> = {
  name: "Full name",
  phone: "Mobile number",
  flat: "Flat / House no.",
  society: "Society / Building",
  street: "Road / Full address",
  area: "Area / Locality",
  pincode: "Pincode",
};

const grindCopy: Record<Grind, string> = {
  Fine: "Silky flour for soft phulkas and thin chapatis.",
  Medium: "The everyday balance. Our default for most homes.",
  Coarse: "More texture and bite, great for bhakri and thick parathas.",
};

const TRACK_STEPS = ["New", "Confirmed", "Grinding", "Out for Delivery", "Delivered"];

export default function Storefront() {
  const [cart, setCart] = useState<Line[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>("closed");
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [payment, setPayment] = useState<"cash" | "upi">("upi");
  const [order, setOrder] = useState<{ id: string; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Address, string>>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [bump, setBump] = useState(0);
  const [packChoice, setPackChoice] = useState<Record<ProductId, PackSize>>({ maharashtra: 5, lokwan: 5, sharbati: 5 });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore cart; forward Identity invite/recovery links to the admin page.
  useEffect(() => {
    if (/(invite|recovery|confirmation|email_change)_token=/.test(window.location.hash)) {
      window.location.replace("/admin" + window.location.hash);
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      if (Array.isArray(saved)) setCart(saved.filter((l) => products.some((p) => p.id === l.id) && (l.kg === 2 || l.kg === 5)));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  useEffect(() => {
    document.body.style.overflow = step === "closed" ? "" : "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setStep("closed");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const count = cart.reduce((s, x) => s + x.qty, 0);
  const subtotal = useMemo(() => cart.reduce((s, l) => s + priceFor(l.id, l.kg) * l.qty, 0), [cart]);

  function add(id: ProductId, kg: PackSize) {
    setCart((old) => {
      const found = old.find((x) => x.id === id && x.kg === kg);
      return found ? old.map((x) => (x === found ? { ...x, qty: Math.min(30, x.qty + 1) } : x)) : [...old, { id, kg, qty: 1, grind: "Medium", note: "" }];
    });
    const p = products.find((x) => x.id === id)!;
    setToast(`${p.short} · ${kg} KG added`);
    setBump((b) => b + 1);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }
  const update = (i: number, patch: Partial<Line>) => setCart((old) => old.map((x, n) => (n === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => setCart((old) => old.filter((_, n) => n !== i));
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart, payment_method: payment, address }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        throw new Error(data.error || "Could not place your order.");
      }
      setOrder({ id: data.order.id, total: data.order.total });
      const old: SavedOrder[] = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
      const phone = address.phone.replace(/\D/g, "").slice(-10);
      localStorage.setItem(ORDERS_KEY, JSON.stringify([{ id: data.order.id, phone, total: data.order.total, createdAt: data.order.createdAt }, ...old].slice(0, 10)));
      window.dispatchEvent(new Event("flazzo:orders"));
      setCart([]);
      setStep("done");
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="grainOverlay" aria-hidden="true" />
      <header className="top">
        <a href="#" className="brand" aria-label="FLAZZO home">
          FLAZZO<sup>™</sup>
          <small>FRESH ATTA YOUR WAY</small>
        </a>
        <nav className="nav">
          <button onClick={() => scrollTo("shop")}>Wheat</button>
          <button onClick={() => scrollTo("grind")}>Grind</button>
          <button onClick={() => scrollTo("how")}>How it works</button>
          <button onClick={() => scrollTo("track")}>Track order</button>
        </nav>
        <button className="cartBtn" onClick={() => setStep("cart")} aria-label={`Open cart, ${count} items`}>
          <ShoppingBag size={18} /> <span className="cartLabel">Cart</span>
          <b key={bump} className={bump ? "bump" : ""}>{count}</b>
        </button>
      </header>

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="heroText">
            <p className="eyebrow reveal" style={{ animationDelay: "0ms" }}>
              <MapPin size={13} /> Now delivering in {SERVICE_AREA.area} · {SERVICE_AREA.pincode}
            </p>
            <h1 className="reveal" style={{ animationDelay: "90ms" }}>
              Your wheat.
              <br />
              <em>Your way.</em>
            </h1>
            <p className="heroCopy reveal" style={{ animationDelay: "180ms" }}>
              Fresh atta, ground only after you order. Pick your wheat, your pack size and how fine you like it. We mill it and bring it to your door.
            </p>
            <div className="heroCtas reveal" style={{ animationDelay: "270ms" }}>
              <button className="limeBtn" onClick={() => scrollTo("shop")}>
                Shop wheat <ArrowRight size={17} />
              </button>
              <span className="heroPrice">
                From <b>{money(109)}</b> / 2 KG
                <br />
                Delivery included
              </span>
            </div>
          </div>
          <div className="heroArt" aria-hidden="true">
            <svg className="stamp" viewBox="0 0 200 200">
              <defs>
                <path id="circ" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
              </defs>
              <text>
                <textPath href="#circ">GROUND FRESH BY ORDER · GROUND FRESH BY ORDER · </textPath>
              </text>
            </svg>
            <FlourBag variant={2} label="Sharbati" kg={5} className="heroBag back" />
            <FlourBag variant={0} label="Lokwan" kg={2} className="heroBag front" />
          </div>
        </section>

        <div className="ticker" aria-label="Why FLAZZO">
          <div className="tickerTrack">
            {[0, 1].map((k) => (
              <div key={k} aria-hidden={k === 1}>
                {["Carefully sourced grains", "Hygienic milling", "Ground when you order", "Home delivery included", "Cash or UPI at delivery", "Fine · Medium · Coarse"].map((t) => (
                  <span key={t}>
                    {t}
                    <i className="spark" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* SHOP */}
        <section id="shop" className="section">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">01 · Pick your favourite</p>
              <h2>Three wheats, milled to order</h2>
            </div>
            <p className="muted sideNote">Every pack is ground after you order, never sitting on a shelf. 2 KG and 5 KG packs. Prices include home delivery.</p>
          </div>

          <div className="shelf">
            {products.map((p, i) => {
              const kg = packChoice[p.id];
              const price = priceFor(p.id, kg);
              const perKg = Math.round((price / kg) * 10) / 10;
              return (
                <article className={`shelfRow r${i}`} key={p.id}>
                  <div className="shelfArt">
                    <span className="shelfNum">0{i + 1}</span>
                    <FlourBag variant={i} label={p.short} kg={kg} className="shelfBag" />
                  </div>
                  <div className="shelfInfo">
                    <span className="tag">{p.tag}</span>
                    <h3>{p.name}</h3>
                    <p>{p.detail}</p>
                    <div className="packToggle" role="radiogroup" aria-label={`${p.name} pack size`}>
                      {([2, 5] as PackSize[]).map((size) => (
                        <button
                          key={size}
                          role="radio"
                          aria-checked={kg === size}
                          className={kg === size ? "on" : ""}
                          onClick={() => setPackChoice((c) => ({ ...c, [p.id]: size }))}
                        >
                          <b>{size} KG</b>
                          <span>{money(priceFor(p.id, size))}</span>
                        </button>
                      ))}
                    </div>
                    <div className="buyRow">
                      <div>
                        <span className="price">{money(price)}</span>
                        <small>{money(perKg)}/kg · delivery included</small>
                      </div>
                      <button className="addBtn" onClick={() => add(p.id, kg)}>
                        Add to cart <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* GRIND */}
        <section id="grind" className="grindSection">
          <div className="grindInner">
            <div className="grindHead">
              <p className="eyebrow">02 · Choose your grind</p>
              <h2>
                Fine, medium or coarse.
                <br />
                <em>Set it for every pack.</em>
              </h2>
              <p>Tell us how you like your atta when you check out. Add a note too, like a little extra coarseness for bhakri. We grind each pack the way you asked.</p>
            </div>
            <div className="grindCards">
              {GRIND_OPTIONS.map((g, i) => (
                <figure key={g} className={`grindCard g${i}`}>
                  <GrainTexture grind={g} />
                  <figcaption>
                    <b>{g}</b>
                    <span>{grindCopy[g]}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* HOW */}
        <section id="how" className="section how">
          <div className="sectionHead">
            <div>
              <p className="eyebrow">03 · How it works</p>
              <h2>From grain to your kitchen</h2>
            </div>
          </div>
          <ol className="steps">
            {[
              { icon: Wheat, t: "Pick your wheat", d: "Maharashtra, Lokwan or Sharbati, in 2 KG or 5 KG packs." },
              { icon: Cog, t: "Set the fineness", d: "Fine, medium or coarse for every pack, plus an optional note." },
              { icon: PackageCheck, t: "We mill it fresh", d: "Your grain is cleaned and ground hygienically after you order." },
              { icon: Truck, t: "Delivered, pay then", d: "Delivered to your door at no extra cost. Pay by cash or UPI." },
            ].map(({ icon: Icon, t, d }, i) => (
              <li key={t}>
                <span className="stepIcon">
                  <Icon size={22} />
                </span>
                <span className="stepNum">0{i + 1}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* REFERRAL */}
        <section className="referral">
          <div>
            <p className="eyebrow">Refer &amp; earn</p>
            <h2>Give 1 KG. Get 1 KG.</h2>
            <p>Refer a new customer. When they buy any 5 KG wheat pack, you earn 1 KG Lokwan Wheat free.</p>
          </div>
          <div className="reward" aria-hidden="true">
            <span>1 KG</span>
            <b>FREE</b>
          </div>
        </section>

        <TrackOrder />
      </main>

      <footer>
        <div>
          <div className="brand light">
            FLAZZO<sup>™</sup>
            <small>FRESH ATTA YOUR WAY</small>
          </div>
          <p>Freshly ground wheat flour, delivered.</p>
        </div>
        <div className="footCol">
          <b>Service area</b>
          <span>
            Currently operational in {SERVICE_AREA.area} – {SERVICE_AREA.pincode}
          </span>
        </div>
        <div className="footCol">
          <b>Payment</b>
          <span>Cash or UPI at the time of delivery</span>
        </div>
        <div className="footCol">
          <b>Need help?</b>
          <span>
            <a href="#track">Track an order</a>
          </span>
        </div>
      </footer>

      {/* TOAST */}
      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">
        {toast && (
          <>
            <CheckCircle2 size={18} /> {toast}
            <button onClick={() => setStep("cart")}>View cart</button>
          </>
        )}
      </div>

      {/* DRAWER */}
      <div className={`overlay ${step !== "closed" ? "open" : ""}`} onClick={() => setStep("closed")} aria-hidden={step === "closed"}>
        <aside className="drawer" role="dialog" aria-modal="true" aria-label="Your cart" onClick={(e) => e.stopPropagation()}>
          <div className="drawerTop">
            {step !== "done" ? (
              <ol className="crumbs">
                <li className={step === "cart" ? "on" : "done"}>
                  <button onClick={() => setStep("cart")}>Cart</button>
                </li>
                <li className={step === "details" ? "on" : ""}>Delivery</li>
                <li>Done</li>
              </ol>
            ) : (
              <span />
            )}
            <button className="close" onClick={() => setStep("closed")} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {step === "cart" && (
            <>
              <h2>Your cart</h2>
              {cart.length === 0 ? (
                <div className="empty">
                  <FlourBag variant={0} label="Empty" className="emptyBag" />
                  <p>Your cart is empty. Add a wheat pack to continue.</p>
                  <button
                    className="ghostBtn"
                    onClick={() => {
                      setStep("closed");
                      scrollTo("shop");
                    }}
                  >
                    Browse wheat <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <ul className="cartList">
                    {cart.map((l, i) => {
                      const p = products.find((x) => x.id === l.id)!;
                      return (
                        <li className="cartLine" key={`${l.id}-${l.kg}`}>
                          <FlourBag variant={products.indexOf(p)} label={p.short} kg={l.kg} className="lineBag" />
                          <div className="lineInfo">
                            <b>{p.name}</b>
                            <small>
                              {l.kg} KG · {money(priceFor(l.id, l.kg))} each
                            </small>
                            <div className="qty">
                              <button onClick={() => update(i, { qty: Math.max(1, l.qty - 1) })} aria-label="Decrease quantity" disabled={l.qty <= 1}>
                                <Minus size={14} />
                              </button>
                              <span>{l.qty}</span>
                              <button onClick={() => update(i, { qty: Math.min(30, l.qty + 1) })} aria-label="Increase quantity">
                                <Plus size={14} />
                              </button>
                              <button className="trash" onClick={() => remove(i)} aria-label={`Remove ${p.name}`}>
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                          <b className="lineTotal">{money(priceFor(l.id, l.kg) * l.qty)}</b>
                        </li>
                      );
                    })}
                  </ul>
                  <Bill subtotal={subtotal} />
                  <button className="primary full" onClick={() => setStep("details")}>
                    Proceed to delivery <ArrowRight size={17} />
                  </button>
                </>
              )}
            </>
          )}

          {step === "details" && (
            <form onSubmit={placeOrder} noValidate>
              <h2>Where should we deliver?</h2>
              <p className="muted areaNote">
                <MapPin size={14} /> We currently deliver in {SERVICE_AREA.area} ({SERVICE_AREA.pincode}).
              </p>
              <div className="formGrid">
                {(Object.keys(fieldLabels) as (keyof Address)[]).map((k) => (
                  <label key={k} className={k === "street" ? "wide" : ""}>
                    {fieldLabels[k]}
                    <input
                      required
                      value={address[k]}
                      inputMode={k === "phone" || k === "pincode" ? "numeric" : undefined}
                      autoComplete={({ name: "name", phone: "tel-national", pincode: "postal-code", street: "street-address" } as Record<string, string>)[k]}
                      maxLength={k === "phone" ? 14 : k === "pincode" ? 6 : 200}
                      placeholder={k === "phone" ? "10-digit mobile number" : ""}
                      aria-invalid={!!fieldErrors[k]}
                      onChange={(e) => {
                        setAddress({ ...address, [k]: e.target.value });
                        if (fieldErrors[k]) setFieldErrors({ ...fieldErrors, [k]: undefined });
                      }}
                    />
                    {fieldErrors[k] && <span className="fieldError">{fieldErrors[k]}</span>}
                  </label>
                ))}
              </div>

              <h3 className="formH">Grinding for each pack</h3>
              {cart.map((l, i) => {
                const p = products.find((x) => x.id === l.id)!;
                return (
                  <div className="grind" key={`${l.id}-${l.kg}`}>
                    <b>
                      {p.name} · {l.kg} KG × {l.qty}
                    </b>
                    <div className="seg" role="radiogroup" aria-label="Grinding fineness">
                      {GRIND_OPTIONS.map((g) => (
                        <button type="button" key={g} role="radio" aria-checked={l.grind === g} className={l.grind === g ? "on" : ""} onClick={() => update(i, { grind: g })}>
                          {g}
                        </button>
                      ))}
                    </div>
                    <textarea placeholder="Any personal preference? (optional)" maxLength={500} value={l.note} onChange={(e) => update(i, { note: e.target.value })} />
                  </div>
                );
              })}

              <h3 className="formH">Payment at delivery</h3>
              <div className="payment">
                <label className={payment === "upi" ? "on" : ""}>
                  <input type="radio" name="pay" checked={payment === "upi"} onChange={() => setPayment("upi")} />
                  <Smartphone size={18} /> UPI
                </label>
                <label className={payment === "cash" ? "on" : ""}>
                  <input type="radio" name="pay" checked={payment === "cash"} onChange={() => setPayment("cash")} />
                  <Banknote size={18} /> Cash
                </label>
              </div>

              <Bill subtotal={subtotal} payLabel="Pay at delivery" />
              {formError && (
                <p className="formError" role="alert">
                  {formError}
                </p>
              )}
              <button className="primary full" disabled={busy || cart.length === 0}>
                {busy ? <span className="spinner" /> : null}
                {busy ? "Placing order…" : `Place order · ${money(subtotal)}`}
              </button>
              <p className="fine">
                <ShieldCheck size={13} /> No online payment needed. You pay when your atta arrives.
              </p>
            </form>
          )}

          {step === "done" && order && (
            <div className="success">
              <div className="successMark">
                <CheckCircle2 size={44} />
              </div>
              <p className="eyebrow">Order received</p>
              <h2>Thank you!</h2>
              <p>Your FLAZZO order is in. We'll grind it fresh and deliver it soon.</p>
              <div className="orderId">
                <span>Order ID</span>
                <b>{order.id}</b>
                <small>{money(order.total)} · pay at delivery</small>
              </div>
              <p className="muted">Keep your Order ID and mobile number to track this order. It's also saved on this device.</p>
              <button
                className="primary full"
                onClick={() => {
                  setStep("closed");
                  setOrder(null);
                  setTimeout(() => scrollTo("track"), 50);
                }}
              >
                Track this order <ArrowRight size={17} />
              </button>
              <button className="ghostBtn full" onClick={() => setStep("closed")}>
                Continue shopping
              </button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Bill({ subtotal, payLabel = "Total" }: { subtotal: number; payLabel?: string }) {
  return (
    <div className="bill">
      <p>
        <span>Subtotal</span>
        <b>{money(subtotal)}</b>
      </p>
      <p>
        <span>Delivery charges</span>
        <b>
          <del>{money(DELIVERY_STRIKE_PRICE)}</del> <i>FREE</i>
        </b>
      </p>
      <p className="total">
        <span>{payLabel}</span>
        <b>{money(subtotal)}</b>
      </p>
    </div>
  );
}

function TrackOrder() {
  const [saved, setSaved] = useState<SavedOrder[]>([]);
  const [id, setId] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TrackedOrder | null>(null);

  useEffect(() => {
    const load = () => {
      try {
        setSaved(JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]"));
      } catch {}
    };
    load();
    window.addEventListener("flazzo:orders", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("flazzo:orders", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  async function lookup(orderId = id, mobile = phone) {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, phone: mobile }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not find that order.");
      setResult(data.order);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const stepIndex = result ? TRACK_STEPS.indexOf(result.status) : -1;

  return (
    <section id="track" className="section track">
      <div className="trackCard">
        <div className="trackForm">
          <p className="eyebrow">Guest orders</p>
          <h2>Track your order</h2>
          <p className="muted">Enter the Order ID from your confirmation and the mobile number you ordered with.</p>
          {saved.length > 0 && (
            <div className="recent">
              <span>Recent on this device</span>
              {saved.slice(0, 4).map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    setId(o.id);
                    setPhone(o.phone);
                    lookup(o.id, o.phone);
                  }}
                >
                  #{o.id.slice(0, 8)} · {money(o.total)} <ArrowUpRight size={13} />
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              lookup();
            }}
          >
            <label>
              Order ID
              <input value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. 3f2a9c1e-…" required />
            </label>
            <label>
              Mobile number
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="10-digit mobile number" required />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? <span className="spinner" /> : <Search size={16} />} {busy ? "Looking up…" : "Find order"}
            </button>
          </form>
          {error && (
            <p className="formError" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="trackResult" aria-live="polite">
          {busy && (
            <div className="skeleton">
              <span />
              <span />
              <span />
              <span />
            </div>
          )}
          {!busy && !result && (
            <div className="trackEmpty">
              <Truck size={34} />
              <p>Your order status shows up here, from New to Delivered.</p>
            </div>
          )}
          {!busy && result && (
            <div className="trackOut">
              <div className="trackHead">
                <span>#{result.id.slice(0, 8)}</span>
                <b className={`pill s-${result.status.replace(/\s+/g, "-").toLowerCase()}`}>{result.status}</b>
              </div>
              {result.status === "Cancelled" ? (
                <p className="muted">This order was cancelled. Please place a new order if you still need atta.</p>
              ) : (
                <ol className="progress">
                  {TRACK_STEPS.map((s, i) => (
                    <li key={s} className={i <= stepIndex ? "on" : ""}>
                      <i />
                      {s}
                    </li>
                  ))}
                </ol>
              )}
              <ul className="trackItems">
                {result.items.map((it, i) => (
                  <li key={i}>
                    {it.productName} · {it.kg} KG × {it.quantity} <span>{it.grinding}</span>
                  </li>
                ))}
              </ul>
              <p className="trackTotal">
                <span>{result.paymentMethod}</span>
                <b>{money(result.total)}</b>
              </p>
              <small className="muted">Placed {new Date(result.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
