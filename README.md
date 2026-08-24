# East Legon Auto Care — Shop Manager 

A full-stack garage management system: customer & vehicle records with complete
service history, a job pipeline, digital vehicle inspections, invoicing (VAT/NHIL/GETFund),
payments (cash/MoMo/card + Paystack), and automatic WhatsApp updates to customers.

Built with Next.js 14, Postgres (via Drizzle ORM), NextAuth, Tailwind CSS.

---

## 1. What's included

| Area | What it does |
|---|---|
| **Customers & Vehicles** | One customer → many vehicles. Full service history per vehicle. |
| **Jobs** | Kanban pipeline: Intake → Diagnosing → Awaiting Parts → In Progress → Ready for Pickup → Completed. Status changes auto-message the customer on WhatsApp. |
| **Digital inspections** | Add inspection line items (Good / Warning / Urgent) per job. |
| **Invoicing** | Itemized parts/labor, auto VAT (15%) + NHIL/GETFund (6%) calculation, printable invoice view. |
| **Payments** | Record cash/MoMo/card/bank manually, or generate a real Paystack checkout link. A webhook auto-reconciles Paystack payments. |
| **WhatsApp messaging** | Job status updates, quote-ready messages, payment receipts, and free-form messages — all logged per customer. |
| **Inventory** | Parts stock levels with low-stock alerts on the dashboard. |
| **Auth & roles** | Owner / Front Desk / Technician / Accountant login. |

---

## 2. Running it locally

You need Node.js 18+ and a Postgres database (local, or a free one from Neon/Supabase — see step 4).

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL at minimum
npm run db:push           # creates all tables
npm run db:seed           # adds a demo customer, vehicle, job & invoice
npm run dev
```

Visit `http://localhost:3000` and log in with:

```
owner@eastlegonauto.com / changeme123
```

**Change this password immediately** — either from a future admin-settings screen you add,
or right now by running this once in `npm run db:studio` (opens a DB browser) or via a short script,
since there's no self-serve password reset yet.

---

## 3. Environment variables

Copy `.env.example` to `.env` and fill these in:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Your Postgres connection string (see step 4) |
| `NEXTAUTH_SECRET` | Generate one: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` locally, your real domain in production |
| `PAYSTACK_SECRET_KEY` | Paystack Dashboard → Settings → API Keys & Webhooks |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Same page as above |
| `WHATSAPP_ACCESS_TOKEN` | Meta Business → WhatsApp → API Setup (see step 6) |
| `WHATSAPP_PHONE_NUMBER_ID` | Same page as above |
| `WHATSAPP_VERIFY_TOKEN` | Any string you choose — used to verify the webhook |

Without the Paystack/WhatsApp keys, the app still works fully — Paystack buttons will show
a clear error, and WhatsApp sends are logged to the console instead of actually sending, so
you (or the shop) can plug in real credentials whenever they're ready.

---

## 4. Deploying — recommended path (free tier friendly)

### Step A — Database: Neon (free Postgres)
1. Go to https://neon.tech, create a free project.
2. Copy the connection string it gives you into `DATABASE_URL`.

### Step B — Hosting: Vercel
1. Push this project to a GitHub repo.
2. Go to https://vercel.com → New Project → import the repo.
3. Add all the environment variables from step 3 in Vercel's project settings.
4. Deploy. Vercel will run `npm run build` automatically.
5. After the first deploy, run the schema push once from your local machine
   pointed at the production `DATABASE_URL`:
   ```bash
   DATABASE_URL="your-neon-url" npm run db:push
   DATABASE_URL="your-neon-url" npm run db:seed   # optional demo data
   ```
6. Set `NEXTAUTH_URL` to your real Vercel domain (e.g. `https://eastlegonauto.vercel.app`)
   and redeploy so callback URLs work correctly.

### Step C — Custom domain (optional)
Point a domain like `shop.eastlegonauto.com` at Vercel (Vercel → Domains), then update
`NEXTAUTH_URL` again.

---

## 5. Connecting Paystack (payments)

1. Sign up at https://paystack.com, verify your Ghana business.
2. Dashboard → Settings → API Keys & Webhooks → copy the **Secret Key** and **Public Key**
   into your env vars.
3. In the same page, set the **Webhook URL** to:
   ```
   https://yourdomain.com/api/webhooks/paystack
   ```
   This is what confirms MoMo/card payments automatically and marks invoices as paid.
4. Test with Paystack's test cards/MoMo numbers before going live (switch `sk_test_...` →
   `sk_live_...` when ready).

---

## 6. Connecting WhatsApp (Meta Cloud API)

1. Go to https://developers.facebook.com → create an app → add the **WhatsApp** product.
2. Under **API Setup**, note your **Phone Number ID** and generate a **permanent access token**
   (Business Settings → System Users → generate token with `whatsapp_business_messaging` scope).
3. Add both to your env vars.
4. Under **Configuration → Webhook**, set:
   - Callback URL: `https://yourdomain.com/api/webhooks/whatsapp`
   - Verify Token: whatever you set as `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to the `messages` field.
5. **Important — 24 hour rule**: Meta only allows free-form messages within 24 hours of the
   customer's last message to you. Outside that window, you must use a pre-approved
   **template message**. Create templates (e.g. "job_status_update") in Meta Business
   Manager, then use `sendWhatsAppTemplate()` in `lib/whatsapp.ts` instead of
   `sendWhatsAppText()` for those cases. A common workaround: ask customers to send
   "Hi" to your WhatsApp number when they drop off their car, which opens the 24h window
   for the whole visit.

---

## 7. Project structure

```
app/
  dashboard/            All authenticated pages (customers, jobs, invoices, payments, inventory)
  api/
    auth/               NextAuth login
    invoices/[id]/paystack   Initializes a Paystack transaction
    webhooks/paystack   Reconciles payments automatically
    webhooks/whatsapp   Verifies webhook + logs inbound customer replies
  login/                Login page
db/
  schema.ts             All tables (Drizzle ORM)
  seed.ts               Demo data
lib/
  actions.ts            All server actions (create customer, update job status, etc.)
  paystack.ts           Paystack API wrapper
  whatsapp.ts           WhatsApp Cloud API wrapper + message templates
  auth.ts                NextAuth config
```

---

## 8. What to build next (roadmap ideas)

These weren't included yet but are natural next additions:
- **Appointment booking calendar** with bay/lift capacity
- **Customer self-service portal** (magic-link login, view own history & pay balances)
- **Automatic service-due reminders** (e.g. 3 months after an oil change)
- **QR code per vehicle** for instant history lookup
- **Photo/video uploads** on inspections and job intake (before/after damage protection)
- **Staff commission & productivity reports**
- **Multi-shop / fleet accounts** for embassy or NGO clients with several vehicles under one biller
