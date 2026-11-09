# All Uplinks — alluplinks.com

Website, booking system, trade-in tool, shop and admin dashboard for **All Uplinks - Phone Repair Keswick**, 443 The Queensway South, Keswick, Ontario · 905-535-9503.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, React Router 6, Tailwind CSS 3, lucide icons |
| Backend | Node.js 22 + Express 5 (single process serves API, SEO-rendered HTML and static files) |
| Database | SQLite via Node's built-in `node:sqlite` (one file, no native build, WAL mode) |
| Auth | bcrypt-hashed admin passwords, JWT in an httpOnly SameSite=strict cookie, CSRF header check, login rate limiting |
| Email | Nodemailer over any SMTP provider (all attempts recorded in the admin Email log) |
| Uploads | Multer, images only, 8 MB max; customer photos are private (admin-only) |

## Quick start

```bash
npm install
npm run build
npm start            # http://localhost:3001
```

Development with hot reload (API on 3001, Vite on 5173 with proxy):

```bash
npm run dev
```

On first start the database is created and seeded in `storage/` (catalogue, 579 model-specific repair prices, trade-in values, 18 services, products, FAQs). If `ADMIN_PASSWORD` is not set, a random admin password is written to `storage/INITIAL_ADMIN_PASSWORD.txt` — sign in at `/admin`, change it under **Account**, and the file is deleted automatically.

## Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (default 3001) |
| `NODE_ENV=production` | Secure cookies, HTTPS upgrade CSP |
| `DATA_DIR` | Where the database, uploads and secrets live (default `./storage`) — back this folder up |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First admin account (only used when no admin exists) |
| `JWT_SECRET` | Optional; generated and stored in `DATA_DIR` if omitted |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Enables booking/trade-in confirmation emails |
| `ADMIN_NOTIFY_EMAIL` | Where new booking / trade-in / inquiry alerts are emailed (falls back to the public email in Site settings) |

Without SMTP, everything still works: submissions are saved, appear in the dashboard with notifications, and email attempts are logged as `not_sent`.

## Deploying

Any host that runs Node 22.5+ with a persistent disk works (a VPS, Render, Railway, Fly.io, DigitalOcean App Platform with a volume):

```bash
npm ci && npm run build && NODE_ENV=production DATA_DIR=/var/data/alluplinks npm start
```

Put it behind HTTPS (Caddy, Nginx or the platform's proxy) on `alluplinks.com`. After going live, submit `https://alluplinks.com/sitemap.xml` in Google Search Console.

## Testing

```bash
npm run build && npm test
```

`tests/e2e.mjs` starts the server on a throwaway database and checks, in a real browser: every route's status, title, description, canonical and structured data; sitemap/robots; all 579 prices against the source data; the calculator across device types; the full booking flow with photo upload; double-booking and concurrent-booking protection; validation; trade-in estimate and submission; contact, product inquiry and review moderation; admin auth/CSRF; admin price edits reaching the public site; every internal link; image loading and alt text; horizontal overflow at 390 px; console errors; compression and asset size.

## What the owner should review before launch

These were deliberately **not** invented and are editable in the admin dashboard:

1. **Store hours** — Admin → Site settings → Store hours. Until set, the site says "Please call for current store hours" and no hours appear in Google structured data.
2. **Online booking windows** — Admin → Schedule. Seeded as Mon–Fri 10:00–18:00, Sat 10:00–17:00, Sun closed so booking works out of the box; adjust to your real availability.
3. **Warranty** — Admin → Site settings → Warranty. Empty (hidden) until you enter your actual terms.
4. **Public email address and postal code** — Admin → Site settings → Store information.
5. **Product prices** — Admin → Products. Products show "Call for current price" until you enter a price. No stock levels are shown.
6. **Reviews** — Only genuine reviews: approve website submissions or add Google reviews in Admin → Reviews. Add your Google review link in Store information to show a "Review us on Google" button.
7. **Repair prices** — Seeded from the reference pricing research (advertised base price per model and repair, shown with the configurable variance range). Change any price in Admin → Repair prices; it updates the calculator, booking estimates, service pages and schema instantly.

## Images

All photos are from Unsplash (free for commercial use under the Unsplash License), stored locally as optimized WebP at 640 px and 1280 px. Upload your own store and team photos through the admin image fields at any time; uploaded files are served from `/uploads/`.

## Project layout

```
server/        Express app, database schema/seed, SEO renderer, email
  data/        Seed price and trade-in tables (JSON)
shared/        Code shared by browser and server (trade-in valuation, shop categories)
src/           React app: pages/, components/, admin/
public/images/ Optimized photography
tests/         End-to-end suite
storage/       Runtime data (created on first run; not committed)
```
