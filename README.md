# Elevated Events — Website

Party rental site for **Elevated Events** (East Rochester, NY): tents, tables, chairs & lawn games.
Built by Real Easy Sites.

## What's inside

- **Marketing site** (`public/`): hero with an instant guest-count planner, packages, à la carte pricing, a sidewalls upsell, a **live quote builder**, gallery with lightbox, real Facebook reviews, FAQ, and a mobile call/message/quote bar. Includes LocalBusiness schema for local SEO.
- **Backend** (Node/Express + SQLite): quote requests are saved to the database and emailed to the owner. The server recalculates every estimate from `lib/catalog.js`.
- **Admin lead dashboard** (`/admin`, password protected): status pipeline (New → Contacted → Quoted → Booked → Completed / Lost), private notes, tap-to-call/text, CSV export, an **upcoming booked events** list, and a **same-day booking warning** to help avoid double-booking inventory.

```
server.js          thin entry point
db/index.js        SQLite schema + prepared statements
lib/catalog.js     ← PRICES & PACKAGES live here (single source of truth)
lib/auth.js        admin sessions
lib/mailer.js      lead notification email
lib/rateLimit.js   basic spam/abuse protection
routes/api.js      /api/catalog, /api/quote
routes/admin.js    /admin page + /api/admin/*
admin/             dashboard UI (served only through /admin)
public/            the website
```

## Run it

Requires **Node 20.x** (better-sqlite3 has no prebuilt binaries for newer versions).

```bash
npm install
cp .env.example .env    # then fill it in
npm start               # http://localhost:3000   admin: /admin
```

## Changing prices

Edit `lib/catalog.js` and restart. The site, quote builder, emails and dashboard all use it.
The hard-coded prices in `public/index.html` (package cards and price lists) and the fallback catalog at the top of `public/js/site.js` should be updated at the same time.

## Before launch

- [x] `ADMIN_PASSWORD` and `NOTIFY_EMAIL` set in `.env`
- [ ] Add SMTP credentials to `.env` (Gmail app password for elevatedevents585@gmail.com) so lead emails actually send
- [x] Domain set to www.elevatedevents585.com (canonical, sitemap, robots, OG/schema URLs)
- [x] Street address hidden per owner (site shows "East Rochester, NY" only)
- [ ] Confirm the service towns listed
- [ ] Add real lawn-game photos when available (the site currently uses illustrations)
