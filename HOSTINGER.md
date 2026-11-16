# Moving alluplinks.com to Hostinger (Node.js + MySQL)

This guide moves the site from **Render + Turso** to a **Hostinger Node.js web app + Hostinger MySQL**, keeping
**Cloudinary** for photos. Render and Turso stay running and untouched until Hostinger is fully tested, so you can
switch back at any time.

> **Never** paste passwords, tokens or database credentials into chat, GitHub, or any file in this repository.
> Enter them only in hPanel.

**Plan requirement:** a plan that offers *Websites → Add website → **Node.js web app*** (Business Web Hosting, or Cloud
Startup and above). Supported: Express, Node.js 22.x, npm. That is all this site needs.

---

## Phase 0 — Backup (nothing is changed)

1. Sign in at `https://alluplinks.com/admin` → **Site settings** → **Download backup**.
2. Keep two copies of the `.json` file (e.g. computer + Google Drive). It holds all 18 tables: admin login
   (hashed password only), all prices, bookings, trade-ins, inquiries, products, services, reviews, FAQs, settings,
   notifications and the email log. Photos stay in Cloudinary; the backup refers to them.

## Phase 1 — Create the MySQL database

hPanel → **Databases → MySQL Databases** → create:

| Field | Value |
|---|---|
| Database name | e.g. `alluplinks` (Hostinger adds a prefix like `u123456789_alluplinks`) |
| Username | e.g. `alluplinks` (also prefixed) |
| Password | a long random password — save it in a password manager |

Note the **full** database name, the **full** username and the **host** shown in hPanel (usually `localhost`).
The app creates all tables itself on first start.

## Phase 2 — Create the Node.js app from GitHub

hPanel → **Websites → Add website → Node.js web app → Import Git repository**:

| Setting | Value |
|---|---|
| Repository | `ulabdin059-del/alluplinks.com` (authorise Hostinger's GitHub app if asked) |
| Branch | `hostinger-mysql` *(switch to `main` only after the move is approved and merged)* |
| Domain | use Hostinger's **temporary domain** for now — **do not** attach `alluplinks.com` yet |
| Framework | Express |
| Node.js version | 22.x |
| Package manager | npm |
| Install / build command | `npm run build` (dependencies are installed automatically) |
| Entry file / start command | `server.js` / `npm start` (`server/index.js` also works) |

### Environment variables (hPanel → the app → Environment variables)

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DB_HOST` | host from Phase 1 (usually `localhost`) |
| `DB_PORT` | `3306` |
| `DB_NAME` | full database name from Phase 1 |
| `DB_USER` | full username from Phase 1 |
| `DB_PASSWORD` | database password from Phase 1 |
| `JWT_SECRET` | a long random string (64+ characters) — new one, not Render's |
| `ADMIN_EMAIL` | a temporary admin email, e.g. `setup@alluplinks.com` |
| `ADMIN_PASSWORD` | a temporary admin password (replaced by your real login when the backup is restored) |
| `CLOUDINARY_URL` | **same value as on Render** (so existing photos keep working) |
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | the Hostinger mailbox, e.g. `info@alluplinks.com` |
| `SMTP_PASS` | that mailbox's password |
| `MAIL_FROM` | `All Uplinks <info@alluplinks.com>` (same mailbox as `SMTP_USER`) |
| `ADMIN_NOTIFY_EMAIL` | `alluplinks1@gmail.com` (where booking alerts go) |
| `ALLOW_RESTORE` | `true` — **only during the move**; remove it in Phase 5 |

Deploy. Then open `https://<temporary-domain>/api/health`. It should show
`"database":"mysql","storage":"cloudinary","email":"smtp"`.

> **Email DNS:** the mailbox only delivers reliably once alluplinks.com's MX/SPF/DKIM records point to Hostinger
> Email. Changing those is a DNS change: do it only with care, when you are ready. Until then, alerts can still
> go to `alluplinks1@gmail.com`; check Admin → **Email log** for each attempt.

## Phase 3 — Restore the data and test on the temporary domain

1. Open `https://<temporary-domain>/admin` and sign in with the **temporary** `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. **Site settings** → **Restore from backup** → choose the Phase 0 file → enter the temporary password → **Restore backup**.
   - The import is all-or-nothing. Every table's row count is checked against the file before anything is saved.
     If anything fails, nothing changes.
   - The screen lists the restored counts. Compare them with the backup (e.g. **prices 579 or more**, models, products, services).
   - You are signed out. Sign in again with your **real admin email and password from the live site**.
3. Test checklist on the temporary domain:
   - [ ] Home, Services, a service page, Repair prices, Book, Sell, Shop, a product, Contact, FAQ, About, Reviews, Privacy, Terms all load
   - [ ] Calculator: iPhone 15 screen shows **$100 – $155**, the same as the live site
   - [ ] Admin dashboard, bookings, schedule, trade-ins, inquiries, prices grid, products, reviews and settings all show the live data
   - [ ] A test booking (with a photo) appears in Admin. The same slot can't be booked twice. The photo opens in Admin.
   - [ ] Trade-in estimate + submission, contact form, review submission appear in Admin
   - [ ] Confirmation and alert emails arrive (Admin → Email log shows `sent`)
   - [ ] `/sitemap.xml`, `/robots.txt`, page titles and descriptions are present
   - [ ] Mobile: no sideways scrolling; menu works
4. Delete your test booking, trade-in and inquiry in Admin.

## Phase 4 — Switch over (only with approval)

1. Pick a quiet time. On the **live** site, download a **fresh backup**, which includes the latest bookings.
2. Empty the Hostinger database so the fresh backup can be restored:
   - hPanel → Databases → **phpMyAdmin** → select the database → **check all tables → Drop**.
   - Then **restart/redeploy** the app. It recreates empty tables with the temporary admin.
   - The restore is refused while bookings, trade-ins or inquiries exist, so live data can't be overwritten by accident.
3. Restore the fresh backup as in Phase 3 and compare the counts.
4. Attach `alluplinks.com` and `www.alluplinks.com` to the Hostinger app and update DNS as Hostinger instructs.
   **Only change the website (A/CNAME) records. Do not touch the MX/email records unless you are moving email too.**
5. Keep Render and Turso running for 1–2 weeks. **Rollback** = point the website DNS records back to Render.
   Any bookings made on Hostinger during that time can be seen in its Admin.

## Phase 5 — Finish

- Remove `ALLOW_RESTORE` from the environment variables and redeploy.
- After the `hostinger-mysql` branch is approved and merged into `main`, change the app's branch to `main`.
- After 1–2 stable weeks, take a final backup from Render, then retire Render and Turso.
