# All Uplinks — alluplinks.com

Website, booking system, trade-in tool, shop and admin dashboard for **All Uplinks - Phone Repair Keswick**, 443 The Queensway South, Keswick, Ontario · 905-535-9503.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, React Router 6, Tailwind CSS 3, lucide icons |
| Backend | Node.js 22 + Express 5 (single process serves API, SEO-rendered HTML and static files) |
| Database | libSQL: **Turso** cloud database in production (`TURSO_DATABASE_URL`), a local SQLite file in `storage/` for development and tests — same SQL, same code |
| Auth | bcrypt-hashed admin passwords, JWT in an httpOnly SameSite=strict cookie, CSRF header check, login rate limiting |
| Email | **Brevo** HTTP API (recommended, free), Resend API, or SMTP via Nodemailer — all attempts recorded in the admin Email log |
| Uploads | Multer, images only, 8 MB max. **Cloudinary** in production (`CLOUDINARY_URL`), local disk in development. Customer photos are private (signed, admin-only) |
| Hosting | **Render** free web service, auto-deployed from GitHub `main` after CI passes (`render.yaml`) |

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

See `.env.example`. On Render, set them in Dashboard → **alluplinks** → **Environment**.

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | yes (`production`) | Secure cookies, HTTPS-only content policy |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | yes | Cloud database. Without them a local file in `DATA_DIR` is used (data is lost on Render restarts) |
| `CLOUDINARY_URL` | yes | Photo storage. Without it, photos go to local disk (lost on Render restarts) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | yes | Creates the admin account on first start against an empty database |
| `JWT_SECRET` | yes | Signs admin sessions; Render generates it from `render.yaml` |
| `BREVO_API_KEY`, `MAIL_FROM` | for email | Booking / trade-in confirmations. `MAIL_FROM` must be a sender verified in Brevo |
| `ADMIN_NOTIFY_EMAIL` | recommended | Where new booking / trade-in / inquiry alerts are emailed |
| `RESEND_API_KEY` or `SMTP_*` | optional | Alternative email providers (SMTP ports are blocked on Render's free tier) |
| `ADMIN_RESET_PASSWORD=true` | one-time | Resets `ADMIN_EMAIL`'s password to `ADMIN_PASSWORD` on start (remove afterwards) |
| `PORT`, `DATA_DIR`, `CLOUDINARY_FOLDER` | optional | Port (Render sets it), local data folder, Cloudinary folder name |

Without email configured everything still works: submissions are saved and appear in the dashboard, and email attempts are logged as `not_sent`.

## Deploying (Render + Turso + Cloudinary, all free tiers)

1. **Turso** — create database `alluplinks` (region: AWS us-east-1), copy its URL and an auth token.
2. **Cloudinary** — copy the "API environment variable" (`cloudinary://…`).
3. **Brevo** — create an API key and verify the sender email.
4. **Render** — New → **Blueprint** → select this repository. Render reads `render.yaml`, asks for the secret values above and deploys. The first start creates all tables and loads the 579 prices, services, products and FAQs.
5. Check `https://<service>.onrender.com/api/health` → `"database":"turso","storage":"cloudinary","email":"brevo"`.
6. **Domain** — in Render → Settings → Custom Domains, `alluplinks.com` and `www.alluplinks.com` are listed; add the DNS records Render shows at GoDaddy. Render issues the HTTPS certificate automatically.

**Automatic deploys:** every push to `main` runs `.github/workflows/ci.yml` (build + full test suite). Render deploys only when it passes.

**Free-tier sleep:** Render free services sleep after 15 minutes without traffic (first visit then takes ~30–60 s). Either create a free UptimeRobot HTTP monitor for `https://alluplinks.com/api/health` every 5 minutes, or set the repository variable `KEEPALIVE_URL` to enable `.github/workflows/keep-alive.yml` (on a private repository this uses GitHub Actions minutes).

**Backups and moving data:** Admin → Site settings → **Download backup** saves every table as JSON. To restore into another database:

```bash
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/import-backup.mjs alluplinks-backup.json --yes
```

Databases created by earlier versions of this site open unchanged; nothing is re-seeded or overwritten.

After going live, submit `https://alluplinks.com/sitemap.xml` in Google Search Console.

## Testing

```bash
npm run build && npm test
```

`tests/e2e.mjs` starts the server on a throwaway database and checks, in a real browser: every route's status, title, description, canonical and structured data; sitemap/robots; all 579 prices against the source data; the calculator across device types; the full booking flow with photo upload; double-booking and concurrent-booking protection; validation; trade-in estimate and submission; contact, product inquiry and review moderation; admin auth/CSRF; admin price edits reaching the public site; every internal link; image loading and alt text; horizontal overflow at 390 px; console errors; compression and asset size; the health endpoint; backup download and a full restore round trip; cascade deletes.

## What the owner should review before launch

These were deliberately **not** invented and are editable in the admin dashboard:

1. **Store hours** — set to Mon–Fri 9 a.m.–5 p.m., Sat–Sun 10 a.m.–4 p.m. Change in Admin → Site settings → Store hours.
2. **Online booking windows** — follow store hours: 30-minute slots, bookable 14 days ahead with 30 minutes’ notice. Admin → Schedule.
3. **Warranty** — Admin → Site settings → Warranty. Empty (hidden) until you enter your actual terms.
4. **Public email address and postal code** — Admin → Site settings → Store information.
5. **Product prices** — Admin → Products. Products show "Call for current price" until you enter a price. No stock levels are shown.
6. **Reviews** — Only genuine reviews: approve website submissions or add Google reviews in Admin → Reviews. Add your Google review link in Store information to show a "Review us on Google" button.
7. **Repair prices** — Seeded from the reference pricing research (advertised base price per model and repair, shown with the configurable variance range). Change any price in Admin → Repair prices; it updates the calculator, booking estimates, service pages and schema instantly.

## Images

All photos are from Unsplash (free for commercial use under the Unsplash License), stored locally as optimized WebP at 640 px and 1280 px. Upload your own store and team photos through the admin image fields at any time; uploaded files are served from `/uploads/`.

## Project layout

```
server/        Express app, database (db.js), photo storage (storage.js), email, SEO renderer
  data/        Seed price and trade-in tables (JSON)
shared/        Code shared by browser and server (trade-in valuation, shop categories)
src/           React app: pages/, components/, admin/
public/images/ Optimized photography
tests/         End-to-end suite
scripts/       import-backup.mjs (restore a JSON backup)
.github/       CI (build + tests on every push) and optional keep-alive
render.yaml    Render Blueprint (free web service, auto-deploy from main)
storage/       Runtime data (created on first run; not committed)
```
