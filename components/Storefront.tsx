"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ShoppingBag,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  X,
  MapPin,
  MessageCircle,
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
  PAYMENT_METHODS,
  WHATSAPP_NUMBER,
  type ProductId,
  type PackSize,
  type Grind,
} from "@/lib/products";
import { FlourBag } from "./FlourBag";
import { GrainTexture } from "./GrainTexture";

type Line = { id: ProductId; kg: PackSize; qty: number; grind: Grind; note: string };
type Address = { name: string; phone: string; flat: string; society: string; street: string; area: string; pincode: string; maps: string };
type Step = "closed" | "cart" | "details" | "done";

const emptyAddress: Address = { name: "", phone: "", flat: "", society: "", street: "", area: "", pincode: SERVICE_AREA.pincode, maps: "" };

/** Keeps only digits and trims a pasted +91 / leading 0 so the field always holds the 10-digit number. */
function cleanPhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  if (d.length > 10 && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}

const InstagramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r=".6" fill="currentColor" />
  </svg>
);
const CART_KEY = "flazzo_cart_v1";
const ADDRESS_KEY = "flazzo_address_v1";
const PENDING_KEY = "flazzo_pending_order_v1";
const PENDING_TTL = 24 * 60 * 60 * 1000; // ask "did you send it?" again for up to a day

type Pending = { ref: string; total: number; url: string; at: number };

const readCart = (raw: string | null): Line[] => {
  try {
    const saved = JSON.parse(raw || "[]");
    return Array.isArray(saved) ? saved.filter((l) => products.some((p) => p.id === l.id) && (l.kg === 2 || l.kg === 5) && l.qty >= 1) : [];
  } catch {
    return [];
  }
};

const fieldLabels: Record<keyof Address, string> = {
  name: "Full name",
  phone: "Mobile number",
  flat: "Flat / House no.",
  society: "Society / Building",
  street: "Road / Full address",
  area: "Area / Locality",
  pincode: "Pincode",
  maps: "Google Maps location link (optional)",
};

const grindCopy: Record<Grind, string> = {
  Fine: "Silky-smooth flour for soft phulkas and paper-thin chapatis.",
  Medium: "The everyday balance: soft rotis with a light, wholesome bite.",
  Coarse: "A hearty, textured grind with more bite. Made for thick, layered parathas.",
};

/** Same checks the old server API ran, now done in the browser. */
function validate(a: Address) {
  const e: Partial<Record<keyof Address, string>> = {};
  if (a.name.trim().length < 2) e.name = "Please enter your full name.";
  if (a.phone.length !== 10) e.phone = `Mobile number must be 10 digits (${a.phone.length}/10).`;
  else if (!/^[6-9]/.test(a.phone)) e.phone = "Enter a valid Indian mobile number.";
  if (!a.flat.trim()) e.flat = "Flat or house number is required.";
  if (!a.society.trim()) e.society = "Society or building is required.";
  if (!a.street.trim()) e.street = "Road or full address is required.";
  if (!(SERVICE_AREA.areas as readonly string[]).includes(a.area)) e.area = "Choose Baner or Mahalunge.";
  if (a.pincode !== SERVICE_AREA.pincode) e.pincode = `We deliver only in ${SERVICE_AREA.pincode}.`;
  const maps = a.maps.trim();
  if (maps && !/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)/i.test(maps))
    e.maps = "Paste a Google Maps link, or leave this empty.";
  return e;
}

/** Short, human-friendly order reference, e.g. FLZ-7K3Q9A. */
const makeRef = () => "FLZ-" + Math.random().toString(36).slice(2, 8).toUpperCase();

function buildWhatsAppText(ref: string, cart: Line[], a: Address, payment: "cash" | "upi", subtotal: number) {
  const items = cart.map((l, i) => {
    const p = products.find((x) => x.id === l.id)!;
    const price = priceFor(l.id, l.kg);
    const lines = [`${i + 1}. ${p.name} · ${l.kg} KG × ${l.qty} = ${money(price * l.qty)}`, `   Grind: ${l.grind}`];
    if (l.note.trim()) lines.push(`   Note: ${l.note.trim()}`);
    return lines.join("\n");
  });
  return [
    `*New FLAZZO order* (${ref})`,
    "",
    "*Items*",
    ...items,
    "",
    `Subtotal: ${money(subtotal)}`,
    "Delivery: FREE",
    `*Total: ${money(subtotal)}*`,
    `Payment: ${PAYMENT_METHODS[payment]}`,
    "",
    "*Deliver to*",
    a.name.trim(),
    `Phone: +91 ${a.phone}`,
    `${a.flat.trim()}, ${a.society.trim()}`,
    a.street.trim(),
    `${a.area.trim()} – ${a.pincode.trim()}`,
    ...(a.maps.trim() ? [`Location: ${a.maps.trim()}`] : []),
  ].join("\n");
}

export default function Storefront() {
  const [cart, setCart] = useState<Line[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>("closed");
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [payment, setPayment] = useState<"cash" | "upi">("upi");
  const [order, setOrder] = useState<(Pending & { sent: boolean }) | null>(null);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Address, string>>>({});
  const [announce, setAnnounce] = useState("");
  const [bump, setBump] = useState(0);
  const [packChoice, setPackChoice] = useState<Record<ProductId, PackSize>>({ maharashtra: 5, lokwan: 5, sharbati: 5 });

  // Restore this device's cart, delivery details and any order still waiting to be sent on WhatsApp.
  useEffect(() => {
    const savedCart = readCart(localStorage.getItem(CART_KEY));
    setCart(savedCart);
    try {
      const a = JSON.parse(localStorage.getItem(ADDRESS_KEY) || "null");
      if (a && typeof a === "object") {
        const str = (v: unknown) => (typeof v === "string" ? v : "");
        setAddress({
          ...emptyAddress,
          name: str(a.name),
          phone: cleanPhone(str(a.phone)),
          flat: str(a.flat),
          society: str(a.society),
          street: str(a.street),
          area: (SERVICE_AREA.areas as readonly string[]).includes(a.area) ? a.area : "",
          maps: str(a.maps),
        });
      }
    } catch {}
    try {
      const pending: Pending | null = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
      if (pending && savedCart.length && Date.now() - pending.at < PENDING_TTL) {
        setOrder({ ...pending, sent: false });
        setStep("done");
      } else localStorage.removeItem(PENDING_KEY);
    } catch {
      localStorage.removeItem(PENDING_KEY);
    }
    setHydrated(true);

    // Keep the cart in sync when the site is open in more than one tab.
    const onStorage = (e: StorageEvent) => e.key === CART_KEY && setCart(readCart(e.newValue));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(ADDRESS_KEY, JSON.stringify(address));
  }, [address, hydrated]);

  /** Closing the drawer before confirming means "not sent yet": the cart stays, the pending order is dropped. */
  function closeDrawer() {
    if (step === "done") {
      localStorage.removeItem(PENDING_KEY);
      setOrder(null);
    }
    setStep("closed");
  }

  useEffect(() => {
    document.body.style.overflow = step === "closed" ? "" : "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const count = cart.reduce((s, x) => s + x.qty, 0);
  const subtotal = useMemo(() => cart.reduce((s, l) => s + priceFor(l.id, l.kg) * l.qty, 0), [cart]);

  function add(id: ProductId, kg: PackSize) {
    setCart((old) => {
      const found = old.find((x) => x.id === id && x.kg === kg);
      return found ? old.map((x) => (x === found ? { ...x, qty: Math.min(30, x.qty + 1) } : x)) : [...old, { id, kg, qty: 1, grind: "Medium", note: "" }];
    });
    const p = products.find((x) => x.id === id)!;
    setAnnounce(`${p.short} ${kg} KG added to cart`);
    setBump((b) => b + 1);
  }
  const update = (i: number, patch: Partial<Line>) => setCart((old) => old.map((x, n) => (n === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => setCart((old) => old.filter((_, n) => n !== i));
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const errors = validate(address);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setFormError("Please check your delivery details.");
      return;
    }
    if (cart.length === 0) {
      setFormError("Your cart is empty.");
      return;
    }
    const ref = makeRef();
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWhatsAppText(ref, cart, address, payment, subtotal))}`;
    // Opened synchronously inside the submit handler so pop-up blockers allow it.
    const win = window.open(url, "_blank", "noopener");
    if (!win) window.location.href = url;
    // Keep the cart until the customer confirms they actually sent the message.
    const pending: Pending = { ref, total: subtotal, url, at: Date.now() };
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    setOrder({ ...pending, sent: false });
    setStep("done");
  }

  function confirmSent() {
    localStorage.removeItem(PENDING_KEY);
    setCart([]);
    setOrder((o) => (o ? { ...o, sent: true } : o));
  }

  function editOrder() {
    localStorage.removeItem(PENDING_KEY);
    setOrder(null);
    setStep("details");
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
              <MapPin size={13} /> Now delivering in {SERVICE_AREA.label} · {SERVICE_AREA.pincode}
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
            <FlourBag name={products[2].pack} kg={5} className="heroBag back" />
            <FlourBag name={products[1].pack} kg={2} className="heroBag front" />
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
                    <FlourBag name={p.pack} kg={kg} className="shelfBag" />
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

          <p className="comingSoon">
            <span>Coming soon</span> Multigrain, Jowar &amp; Bajri atta, milled fresh the same way.
          </p>
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
              <p>Tell us how you like your atta at checkout, and add a note if you have a preference. We grind every pack exactly the way you asked.</p>
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
      </main>

      <footer>
        <div>
          <div className="brand light">
            FLAZZO<sup>™</sup>
            <small>FRESH ATTA YOUR WAY</small>
          </div>
          <p>Freshly ground wheat flour, delivered.</p>
          <a className="social" href="https://www.instagram.com/flazzo.in/" target="_blank" rel="noopener noreferrer" aria-label="FLAZZO on Instagram">
            <InstagramIcon /> @flazzo.in
          </a>
        </div>
        <div className="footCol">
          <b>Service area</b>
          <span>
            Currently delivering in {SERVICE_AREA.label} – {SERVICE_AREA.pincode}
          </span>
        </div>
        <div className="footCol">
          <b>Payment</b>
          <span>Cash or UPI at the time of delivery</span>
        </div>
        <div className="footCol">
          <b>Need help?</b>
          <span>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">
              Chat on WhatsApp
            </a>
          </span>
        </div>
      </footer>

      {/* FLOATING MINI CART — stays visible while the cart has items */}
      <p className="srOnly" role="status" aria-live="polite">
        {announce}
      </p>
      <button
        className={`miniCart ${count > 0 && step === "closed" ? "show" : ""}`}
        onClick={() => setStep("cart")}
        aria-label={`View cart: ${count} ${count === 1 ? "pack" : "packs"}, ${money(subtotal)}`}
        tabIndex={count > 0 && step === "closed" ? 0 : -1}
      >
        <span key={bump} className={`miniIcon ${bump ? "bump" : ""}`}>
          <ShoppingBag size={17} />
          <b>{count}</b>
        </span>
        <span className="miniText">
          <small>
            {count} {count === 1 ? "pack" : "packs"}
          </small>
          <b>{money(subtotal)}</b>
        </span>
        <ArrowRight size={16} />
      </button>

      {/* DRAWER */}
      <div className={`overlay ${step !== "closed" ? "open" : ""}`} onClick={closeDrawer} aria-hidden={step === "closed"}>
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
            <button className="close" onClick={closeDrawer} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {step === "cart" && (
            <>
              <h2>Your cart</h2>
              {cart.length === 0 ? (
                <div className="empty">
                  <FlourBag name={products[0].pack} className="emptyBag" />
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
                          <FlourBag name={p.pack} kg={l.kg} className="lineBag" />
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
                <MapPin size={14} /> We currently deliver in {SERVICE_AREA.label} ({SERVICE_AREA.pincode}).
              </p>
              <div className="formGrid">
                {(Object.keys(fieldLabels) as (keyof Address)[]).map((k) => {
                  const set = (v: string) => {
                    setAddress({ ...address, [k]: v });
                    if (fieldErrors[k]) setFieldErrors({ ...fieldErrors, [k]: undefined });
                  };
                  const error = fieldErrors[k] && <span className="fieldError">{fieldErrors[k]}</span>;

                  if (k === "area") {
                    return (
                      <div key={k} className="fieldLabel">
                        <span id="areaLabel">{fieldLabels.area}</span>
                        <div className="seg areaSeg" role="radiogroup" aria-labelledby="areaLabel" aria-invalid={!!fieldErrors.area}>
                          {SERVICE_AREA.areas.map((a) => (
                            <button type="button" key={a} role="radio" aria-checked={address.area === a} className={address.area === a ? "on" : ""} onClick={() => set(a)}>
                              {a}
                            </button>
                          ))}
                        </div>
                        {error}
                      </div>
                    );
                  }

                  return (
                    <label key={k} className={k === "street" || k === "maps" ? "wide" : ""}>
                      {fieldLabels[k]}
                      <span className={k === "phone" ? "phoneField" : undefined}>
                        {k === "phone" && <em aria-hidden="true">+91</em>}
                        <input
                          required={k !== "maps"}
                          value={address[k]}
                          type={k === "phone" ? "tel" : "text"}
                          readOnly={k === "pincode"}
                          inputMode={k === "phone" || k === "pincode" ? "numeric" : k === "maps" ? "url" : undefined}
                          autoComplete={({ name: "name", phone: "tel-national", pincode: "postal-code", street: "street-address" } as Record<string, string>)[k]}
                          maxLength={k === "phone" ? 16 : k === "pincode" ? 6 : k === "maps" ? 500 : 200}
                          placeholder={k === "phone" ? "10-digit number" : k === "maps" ? "Paste the link from Google Maps → Share" : ""}
                          aria-invalid={!!fieldErrors[k]}
                          onChange={(e) => set(k === "phone" ? cleanPhone(e.target.value) : e.target.value)}
                          onBlur={
                            k === "phone"
                              ? () => address.phone && address.phone.length !== 10 && setFieldErrors((f) => ({ ...f, phone: `Mobile number must be 10 digits (${address.phone.length}/10).` }))
                              : undefined
                          }
                        />
                      </span>
                      {error}
                    </label>
                  );
                })}
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
              <button className="primary full" disabled={cart.length === 0}>
                Place order · {money(subtotal)}
              </button>
              <p className="fine">
                <ShieldCheck size={13} /> Opens WhatsApp with your order filled in. No online payment needed.
              </p>
            </form>
          )}

          {step === "done" && order && !order.sent && (
            <div className="success">
              <div className="successMark pending">
                <MessageCircle size={40} />
              </div>
              <p className="eyebrow">One last step</p>
              <h2>Did you send it?</h2>
              <p>WhatsApp opened with your order filled in. Tap Send there, then confirm here. Your cart stays saved until you do.</p>
              <div className="orderId">
                <span>Order reference</span>
                <b>{order.ref}</b>
                <small>{money(order.total)} · pay at delivery</small>
              </div>
              <button className="primary full" onClick={confirmSent}>
                <CheckCircle2 size={17} /> Yes, I've sent it
              </button>
              <a className="ghostBtn full" href={order.url} target="_blank" rel="noopener noreferrer">
                Not yet, open WhatsApp again
              </a>
              <button className="textBtn" onClick={editOrder}>
                Edit order details
              </button>
            </div>
          )}

          {step === "done" && order?.sent && (
            <div className="success">
              <div className="successMark">
                <CheckCircle2 size={44} />
              </div>
              <p className="eyebrow">Order sent</p>
              <h2>Thank you!</h2>
              <p>We'll confirm your order on WhatsApp shortly, then grind your atta fresh and bring it to your door.</p>
              <div className="orderId">
                <span>Order reference</span>
                <b>{order.ref}</b>
                <small>{money(order.total)} · pay at delivery</small>
              </div>
              <button className="primary full" onClick={closeDrawer}>
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
