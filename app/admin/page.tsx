"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getUser, login, logout, handleAuthCallback, acceptInvite, updateUser, requestPasswordRecovery, AuthError, MissingIdentityError, type User } from "@netlify/identity";
import { RefreshCw, LogOut, Phone, ArrowLeft } from "lucide-react";
import { ORDER_STATUSES, money } from "@/lib/products";

type Order = {
  id: string;
  createdAt: string;
  customerName: string;
  phone: string;
  address: { flat: string; society: string; street: string; area: string; pincode: string };
  items: { productName: string; kg: number; quantity: number; unitPrice: number; grinding: string; note: string }[];
  total: number;
  paymentMethod: string;
  status: string;
};

type Mode = "loading" | "login" | "invite" | "recovery" | "forgot" | "ready";

function authMessage(e: unknown) {
  if (e instanceof MissingIdentityError) return "Sign-in isn't available in this environment yet.";
  if (e instanceof AuthError) return e.status === 401 ? "Invalid email or password." : e.message;
  return e instanceof Error ? e.message : "Something went wrong.";
}

export default function AdminPage() {
  const [mode, setMode] = useState<Mode>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [inviteToken, setInviteToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<string>("Active");
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setMsg("");
    const res = await fetch("/api/admin/orders", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setOrders([]);
      setMsg(data.error || "Could not load orders.");
      return;
    }
    setOrders(data.orders);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cb = await handleAuthCallback();
        if (cb?.type === "invite" && cb.token) {
          setInviteToken(cb.token);
          setMode("invite");
          return;
        }
        if (cb?.type === "recovery") {
          setUser(cb.user);
          setMode("recovery");
          return;
        }
      } catch (e) {
        setMsg(authMessage(e));
      }
      const u = await getUser();
      setUser(u);
      setMode(u ? "ready" : "login");
    })();
  }, []);

  useEffect(() => {
    if (mode === "ready") load();
  }, [mode, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setInfo("");
    try {
      if (mode === "login") {
        setUser(await login(email, password));
        setMode("ready");
      } else if (mode === "invite") {
        setUser(await acceptInvite(inviteToken, password));
        setMode("ready");
      } else if (mode === "recovery") {
        setUser(await updateUser({ password }));
        setMode("ready");
      } else if (mode === "forgot") {
        await requestPasswordRecovery(email);
        setInfo("If that email has an account, a reset link is on its way.");
      }
      setPassword("");
    } catch (err) {
      setMsg(authMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function change(id: string, status: string) {
    setSaving(id);
    const prev = orders;
    setOrders((o) => o?.map((x) => (x.id === id ? { ...x, status } : x)) ?? null);
    const res = await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error || "Could not update status.");
      setOrders(prev);
    }
    setSaving(null);
  }

  const isAdmin = !!user?.roles?.includes("admin");
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const o of orders ?? []) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);
  const active = (orders ?? []).filter((o) => o.status !== "Delivered" && o.status !== "Cancelled");
  const shown = (orders ?? []).filter((o) => (filter === "All" ? true : filter === "Active" ? active.includes(o) : o.status === filter));
  const today = new Date().toDateString();
  const todays = (orders ?? []).filter((o) => new Date(o.createdAt).toDateString() === today);
  const kgToGrind = active.filter((o) => o.status !== "Out for Delivery").reduce((s, o) => s + o.items.reduce((a, i) => a + i.kg * i.quantity, 0), 0);

  if (mode === "loading") {
    return (
      <main className="adminWrap">
        <div className="adminCard">
          <div className="skeleton">
            <span />
            <span />
            <span />
          </div>
        </div>
      </main>
    );
  }

  if (mode !== "ready") {
    const titles: Record<string, string> = { login: "Admin sign in", invite: "Set your password", recovery: "Choose a new password", forgot: "Reset password" };
    return (
      <main className="adminWrap">
        <div className="adminCard">
          <a href="/" className="brand">
            FLAZZO<sup>™</sup>
            <small>ADMIN</small>
          </a>
          <h1>{titles[mode]}</h1>
          <p className="muted">
            {mode === "invite" ? "Welcome to the FLAZZO order desk. Pick a password to finish setting up your account." : "Order dashboard for the FLAZZO team."}
          </p>
          <form onSubmit={submit}>
            {(mode === "login" || mode === "forgot") && (
              <label>
                Email
                <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
            )}
            {mode !== "forgot" && (
              <label>
                {mode === "login" ? "Password" : "New password"}
                <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? undefined : 8} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>
            )}
            {msg && <p className="formError">{msg}</p>}
            {info && <p className="notice">{info}</p>}
            <button className="primary full" disabled={busy}>
              {busy && <span className="spinner" />}
              {mode === "login" ? "Sign in" : mode === "forgot" ? "Send reset link" : "Save password"}
            </button>
          </form>
          {mode === "login" && (
            <button className="ghostBtn full" onClick={() => { setMode("forgot"); setMsg(""); }}>
              Forgot password?
            </button>
          )}
          {mode === "forgot" && (
            <button className="ghostBtn full" onClick={() => { setMode("login"); setMsg(""); setInfo(""); }}>
              <ArrowLeft size={16} /> Back to sign in
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="adminWrap">
      <div className="adminTop">
        <a href="/" className="brand">
          FLAZZO<sup>™</sup>
          <small>ORDER DASHBOARD</small>
        </a>
        <div className="who">
          <span>{user?.email}</span>
          <button
            className="ghostBtn"
            onClick={async () => {
              await logout().catch(() => {});
              setUser(null);
              setOrders(null);
              setMode("login");
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>

      {!isAdmin ? (
        <div className="adminEmpty">
          <h2>No admin access yet</h2>
          <p>You're signed in, but this account doesn't have the admin role. Ask the site owner to add the “admin” role to your account, then sign out and back in.</p>
        </div>
      ) : (
        <>
          <div className="adminTitle">
            <h1>Orders</h1>
            <button className="primary" onClick={load}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          <div className="stats">
            <div className="stat hl">
              <span>New orders</span>
              <b>{counts["New"] ?? 0}</b>
            </div>
            <div className="stat">
              <span>Active</span>
              <b>{active.length}</b>
            </div>
            <div className="stat">
              <span>KG to grind</span>
              <b>{kgToGrind}</b>
            </div>
            <div className="stat">
              <span>Today · {todays.length} orders</span>
              <b>{money(todays.filter((o) => o.status !== "Cancelled").reduce((s, o) => s + o.total, 0))}</b>
            </div>
          </div>

          <div className="filters">
            {["Active", ...ORDER_STATUSES, "All"].map((s) => (
              <button key={s} className={filter === s ? "on" : ""} onClick={() => setFilter(s)}>
                {s}
                <em>{s === "All" ? orders?.length ?? 0 : s === "Active" ? active.length : counts[s] ?? 0}</em>
              </button>
            ))}
          </div>

          {msg && <p className="formError">{msg}</p>}

          {orders === null ? (
            <div className="orders">
              {[0, 1, 2].map((i) => (
                <div className="adminOrder" key={i}>
                  <div className="skeleton">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="adminEmpty">
              <h2>Nothing here</h2>
              <p>{orders.length === 0 ? "No orders yet. New orders from the storefront show up here." : "No orders match this filter."}</p>
            </div>
          ) : (
            <div className="orders">
              {shown.map((o) => (
                <article className="adminOrder" key={o.id}>
                  <div>
                    <span className="oid">#{o.id.slice(0, 8)} · {new Date(o.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                    <h3>{o.customerName}</h3>
                    <p>
                      <a href={`tel:+91${o.phone}`}>
                        <Phone size={13} /> {o.phone}
                      </a>
                    </p>
                    <p>
                      {o.address.flat}, {o.address.society}
                    </p>
                    <p className="muted">
                      {o.address.street}, {o.address.area} – {o.address.pincode}
                    </p>
                  </div>
                  <ul className="adminItems">
                    {o.items.map((it, i) => (
                      <li key={i}>
                        <b>{it.productName}</b> · {it.kg} KG × {it.quantity} · {it.grinding}
                        {it.note && <small>Note: {it.note}</small>}
                      </li>
                    ))}
                  </ul>
                  <div className="adminSide">
                    <span className="amt">{money(o.total)}</span>
                    <span className="muted">{o.paymentMethod}</span>
                    <select value={o.status} disabled={saving === o.id} onChange={(e) => change(o.id, e.target.value)} aria-label="Order status">
                      {ORDER_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
