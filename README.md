# The Gita Project — Live Book Placement Map

A live, interactive map showing every organisation across the UK where The Gita Project has placed books on yoga and meditation. Donors can see delivery history, find appeals that need funding, and donate directly from the map.

## What it does

### For donors (the public map)
- See all organisations where books have been placed on an interactive UK map
- Markers are color-coded by type: hospitals (blue), prisons (red), schools (green), temples (yellow), libraries (purple), community centres (pink)
- Click any marker to see delivery history and any active funding appeal
- Donate to a specific appeal via Stripe — progress bars show how close each appeal is to its goal
- Filter by organisation type or show only those needing funding
- Pulsing red indicator on markers with active appeals

### For the admin (you)
- **CSV Import** — upload the master spreadsheet to bulk-load organisations; postcodes are automatically geocoded to map coordinates
- **Order Management** — create funding appeals, update status as donations come in and deliveries are made (new → funded → delivered)
- **Organisation Browser** — search and filter all organisations, see which ones appear on the map
- **Dashboard** — overview stats at a glance

### How the donation flow works
1. A donor visits the map and clicks a marker with an active appeal
2. They click "Donate Now" and choose an amount (with optional Gift Aid)
3. They're redirected to Stripe for secure payment
4. On success, the pledged amount updates automatically
5. When the target is met, the order status changes to "funded"
6. After you deliver the books, you mark it "delivered" in the admin panel
7. The map updates to reflect the new delivery

## Setup guide

### 1. Clone and install

```bash
git clone https://github.com/niketbiyani/tgp-map.git
cd tgp-map
npm install
```

### 2. Set up Supabase (free database)

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click **New Project** — choose a name and set a database password
3. Wait for the project to finish setting up (~1 minute)
4. Go to **SQL Editor** (left sidebar) → click **New query**
5. Open the file `supabase-schema.sql` from this repo, copy all of it, paste it into the SQL editor
6. Click **Run** — this creates all the tables you need
7. Go to **Settings** → **API** (left sidebar):
   - Copy the **Project URL** (looks like `https://xxxx.supabase.co`)
   - Copy the **anon public** key
   - Copy the **service_role** key (click "Reveal" — keep this secret)

### 3. Configure environment variables

Copy the example file:
```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your values:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
ADMIN_TOKEN=pick-any-secret-password-for-admin
```

The `ADMIN_TOKEN` can be anything you choose — it's the password you'll use to log into the admin panel.

### 4. Start the app

```bash
npm run dev
```

- **Map:** [http://localhost:3000](http://localhost:3000) — you'll see demo data until you import your CSV
- **Admin:** [http://localhost:3000/admin](http://localhost:3000/admin) — log in with your `ADMIN_TOKEN`

### 5. Import your data

1. Go to [http://localhost:3000/admin/import](http://localhost:3000/admin/import)
2. Upload your master CSV spreadsheet
3. The system will:
   - Parse all organisations from the CSV
   - Geocode every UK postcode to map coordinates (via postcodes.io)
   - Insert everything into the database
   - Create orders for rows that have `target_amount_pence` values
4. Go back to the map — your real organisations should now appear

### 6. Set up Stripe (for accepting donations)

This step is optional — the map works without it, but the "Donate Now" button won't process payments.

1. Create a [Stripe account](https://stripe.com) (free, no monthly fee)
2. In the Stripe dashboard, go to **Developers** → **API keys**
3. Copy the **Secret key** (starts with `sk_test_` for testing, `sk_live_` for real payments)
4. Add to your `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_your-key-here
   ```
5. For the webhook (so payments automatically update order status):
   - In Stripe → **Developers** → **Webhooks** → **Add endpoint**
   - URL: `https://your-domain.com/api/webhook`
   - Select event: `checkout.session.completed`
   - Copy the webhook signing secret and add to `.env.local`:
     ```
     STRIPE_WEBHOOK_SECRET=whsec_your-secret-here
     ```

### 7. Deploy to Vercel (to make it live)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your GitHub repo
3. Add all your environment variables in the Vercel project settings
4. Deploy — Vercel handles everything automatically
5. Update your Stripe webhook URL to use your Vercel domain

## CSV format

Your master spreadsheet should have these column headers (order doesn't matter, extra columns are ignored):

| Column | Required | Description |
|--------|----------|-------------|
| Organisation Name | Yes | Name of the organisation |
| Organisation Type | No | hospital, prison, school, temple, library, community_centre, or other |
| Address 1–5 | No | Address fields (combined automatically) |
| Postcode | Recommended | UK postcode for map placement |
| Phone number | No | Contact phone |
| Contact Person 1/2 | No | Contact names |
| Email 1/2 | No | Contact emails |
| Notes | No | Any notes |
| Date Delivered 2016–2024 | No | Delivery dates (DD/MM/YYYY) — used to calculate total deliveries |
| target_amount_pence | No | Funding goal in pence (e.g. 15000 = £150.00) |
| pledged_amount_pence | No | Amount already raised in pence |
| funding_status | No | new, funded, or delivered |

Columns like "BG Copies" and "SP Books" are ignored — only delivery dates and totals matter for the map.

## Organisation types and map colors

| Type | Color |
|------|-------|
| Hospital | Blue |
| Prison | Red |
| School | Green |
| Temple | Yellow/Amber |
| Library | Purple |
| Community Centre | Pink |
| Other | Grey |

Markers with an active funding appeal have a pulsing red dot.

## Admin panel pages

| Page | URL | What it does |
|------|-----|-------------|
| Dashboard | `/admin` | Overview stats — total orgs, deliveries, orders by status |
| Import CSV | `/admin/import` | Upload your master spreadsheet to bulk-load data |
| Orders | `/admin/orders` | View and manage funding appeals; filter by status; one-click status updates |
| Organisations | `/admin/organisations` | Browse all organisations; search by name/postcode; see geocode status |

## Tech stack

- **Next.js 16** (App Router, TypeScript) — the web framework
- **Tailwind CSS 4** — styling
- **Supabase** — PostgreSQL database with a visual dashboard
- **Leaflet** — interactive maps (free, no API key needed)
- **Stripe** — payment processing for donations
- **postcodes.io** — free UK postcode geocoding API

## Development

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Run production build
npm run lint     # Check code quality
```
