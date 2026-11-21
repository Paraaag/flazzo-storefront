# FLAZZO — Fresh Atta Your Way

A fully static storefront (Next.js `output: "export"`). No server, no database.
"Place order" opens WhatsApp with the cart, grind choices, notes, address and payment method pre-filled.

Products, prices, grind options and delivery areas all live in `lib/products.ts`.

## WhatsApp number

Set the number that receives orders (country code + number, digits only), either:

- in `lib/products.ts` → `WHATSAPP_NUMBER` default, or
- as an env var `NEXT_PUBLIC_WHATSAPP_NUMBER=919876543210` (e.g. in Vercel → Project → Settings → Environment Variables, then redeploy).

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static site written to out/
```

## Deploy

- **Vercel:** import the repo; it auto-detects Next.js. No settings needed.
- **Anywhere else:** run `npm run build` and upload the `out/` folder to any static host.
