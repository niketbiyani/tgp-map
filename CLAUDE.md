@AGENTS.md

# The Gita Project — Live Map

A web-based GIS mapping application for The Gita Project, a UK charity that places books on yoga and meditation (like the Bhagavad Gita) in organisations across the UK — hospitals, prisons, schools, temples, libraries, and community centres.

## What this app does

- Public interactive map showing all organisations where books have been placed
- Color-coded markers by organisation type with delivery history
- Donors can see unfunded orders on the map and donate via Stripe
- Admin panel for CSV import, order management, and status tracking
- Order lifecycle: `new` → `funded` → `delivered`

## Tech stack

- **Framework:** Next.js 16 (App Router, TypeScript, Turbopack)
- **Styling:** Tailwind CSS 4
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **Map:** Leaflet via react-leaflet (free, no API key)
- **Payments:** Stripe Checkout
- **Geocoding:** postcodes.io (free UK postcode API, results cached in DB)

## Project structure

```
app/
  page.tsx                          # Public map page (client component, loads MapView dynamically)
  layout.tsx                        # Root layout
  components/
    MapView.tsx                     # Interactive Leaflet map with markers, popups, donate modal
  data/
    mock-organisations.ts           # Demo data (used when Supabase not connected)
  lib/
    types.ts                        # Shared TypeScript types (Organisation, Order, Donation, etc.)
    supabase-server.ts              # Server-side Supabase admin client + auth helper
    supabase-browser.ts             # Client-side Supabase client (anon key)
    geocode.ts                      # Batch postcode geocoding via postcodes.io with DB cache
  admin/
    layout.tsx                      # Admin layout with nav bar + token-based login gate
    page.tsx                        # Admin dashboard (stats overview)
    import/page.tsx                 # CSV import page
    orders/page.tsx                 # Order management (status updates)
    organisations/page.tsx          # Organisation list with search/filter
  api/
    organisations/route.ts          # GET — all orgs with active orders (public, for the map)
    orders/route.ts                 # GET — list orders; POST — create new order (admin)
    orders/[id]/route.ts            # PATCH — update order status/fields (admin)
    import/route.ts                 # POST — CSV upload with geocoding + batch insert (admin)
    donate/route.ts                 # POST — create Stripe checkout session (public)
    webhook/route.ts                # POST — Stripe webhook for payment confirmation
supabase-schema.sql                 # Full database schema (run in Supabase SQL editor)
.env.example                        # Template for required environment variables
```

## Database tables

- **organisations** — name, type, address, postcode, lat/lon, contacts, deliveries_total
- **orders** — linked to org, target/pledged amounts in pence, status (new/funded/delivered)
- **donations** — linked to order, amount, donor info, Stripe session ID, gift aid flag
- **postcode_geocode** — cache of UK postcode → lat/lon lookups

## Key conventions

- Admin auth uses a bearer token from env var `ADMIN_TOKEN` (checked in `requireAdmin()`)
- API routes use `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'`
- The map falls back to mock data in `app/data/mock-organisations.ts` if the API returns no results
- CSV import expects headers matching the charity's master spreadsheet format (see `HEADER_MAP` in `app/api/import/route.ts`)
- Postcode geocoding uses batch POST to postcodes.io (up to 100 at a time) with local DB cache
- All monetary values are stored in pence (integer) and formatted as pounds on the frontend
- Organisation types: hospital, prison, school, temple, library, community_centre, other
- Date format in CSV: DD/MM/YYYY (UK format)

## Commands

```
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Environment variables

See `.env.example` — requires Supabase keys, admin token, and optionally Stripe keys.
