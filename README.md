# Hometown Hub — Digital Community Platform

Reconnect with your hometown. Hometown Hub is a focused community platform where
people from the same city or village can **share announcements, discuss local
topics, organize events and preserve local culture** — even after moving away
for work or education.

This README is written as a **beginner tutorial**: it assumes nothing and walks
you end to end, from installing tools to deploying to production.

---

## Table of contents

1. [Project overview & features](#1-project-overview--features)
2. [Tech stack and why](#2-tech-stack-and-why)
3. [How the app works (architecture)](#3-how-the-app-works-architecture)
4. [Prerequisites](#4-prerequisites)
5. [Folder structure explained](#5-folder-structure-explained)
6. [Step-by-step local setup](#6-step-by-step-local-setup)
7. [Understanding the database](#7-understanding-the-database)
8. [Understanding the API](#8-understanding-the-api)
9. [Understanding the frontend](#9-understanding-the-frontend)
10. [Authentication explained simply](#10-authentication-explained-simply)
11. [Manual testing checklist (per role)](#11-manual-testing-checklist-per-role)
12. [Common errors and fixes](#12-common-errors-and-fixes)
13. [Production preparation](#13-production-preparation)
14. [Deployment guide](#14-deployment-guide)
15. [Git & GitHub basics](#15-git--github-basics)
16. [KPIs & tracking](#16-kpis--tracking)
17. [Future enhancements](#17-future-enhancements)
18. [Learning resources](#18-learning-resources)
19. [Glossary](#19-glossary)

---

## 1. Project overview & features

**Problem:** people who move away from their hometown lose touch with local
news. WhatsApp groups are noisy; social media is too broad.

**Solution:** one focused hub per city/village, with three user roles:

| Role | Powers |
|---|---|
| **Member** | Register/login · profile with hometown + current city · browse/search communities · create a community (pending until admin approves) · request to join a community · post text/photos/announcements* · like, comment, share (copy link) · report abuse · create & RSVP to events · notifications · apply to become a moderator |
| **Community Moderator** (per community, plus founder) | Approve/reject join requests · edit community rules · pin/unpin announcements · delete posts & comments · manage events · review moderator applications (founder) |
| **Platform Admin** | Dashboard with stats & 7-day chart · approve/reject community requests · manage users (search, roles, deactivate) · abuse report queue (dismiss or delete content) · manage categories |

\* the *announcement* post type is a moderator privilege.

Out of scope (intentionally): native mobile apps, paid ads, AI moderation,
government alert integration — see [Future enhancements](#17-future-enhancements).

---

## 2. Tech stack and why

This project was written to run on a **Next.js + PostgreSQL** platform. It keeps
every concept from a classic MERN course (REST API, JWT, bcrypt, Mongoose-style
models, React, Cloudinary) — here's the exact mapping:

| MERN concept | This project uses | Why |
|---|---|---|
| **React + Vite** frontend | **React 19 inside Next.js 16** (App Router) | Same component model & hooks; routing comes built in |
| **React Router** | `src/app/**` file-based routing | A folder = a URL, zero config |
| **Axios** | `fetch` wrapper in `src/lib/client.ts` | One service layer: JWT header, JSON envelope, friendly errors |
| **Express.js REST API** | **Next.js Route Handlers** (`src/app/api/**`) | Same verbs/paths (`GET /api/communities` …), same controllers-style code, deployed together with the UI |
| **MongoDB + Mongoose** | **PostgreSQL + Drizzle ORM** (`src/db/schema.ts`) | Typed schemas, `references()` = relationships, indexes — same ideas, relational flavour |
| **JWT auth** | `jose` (HS256 tokens) | Stateless login tokens in the `Authorization` header |
| **bcrypt** | `bcryptjs` | Pure-JS password hashing (cost 10) |
| **Multer + Cloudinary** | `/api/upload` (multipart FormData) → Cloudinary **or** base64 fallback | Works out of the box; add free Cloudinary keys for production |
| **helmet / CORS / rate-limit** | Security headers in `next.config.ts`, same-origin app (no CORS needed), in-memory rate limiter in `src/lib/http.ts` | Same protections, one server |
| **Tailwind CSS** | Tailwind v4 with a custom paper/ink/ember theme | Mobile-first utility styling |

**Why this shape is nice for a first project:** one repo, one `npm install`,
one server, one deploy — yet every layer (models → routes → UI) is still
clearly separated so the mental model transfers 1:1 to MERN.

---

## 3. How the app works (architecture)

```
┌─────────────────────────────── your browser ───────────────────────────────┐
│  React pages (src/app/…)  ──►  api() helper (src/lib/client.ts)            │
│        │ builds JSON + attaches  "Authorization: Bearer <JWT>"             │
└────────┼──────────────────────────────────────────────────────────────────┘
         ▼  HTTP (same origin)
┌──────────────────────────── your server ───────────────────────────────────┐
│  Route Handler (src/app/api/posts/route.ts)                                │
│        │ 1. getAuthUser() → verify JWT, load user                          │
│        │ 2. validate input, check permissions                              │
│        │ 3. Drizzle query → PostgreSQL                                     │
│        │ 4. side effects (notifications)                                   │
│        └──► responds  { success, message, data }                           │
└──────────────────────────────────────┬─────────────────────────────────────┘
                                       ▼
                              PostgreSQL tables
            (users, communities, community_members, posts, …)
```

**Example flow — "Priya creates a post":**

1. Priya types in the composer on `/communities/2` and clicks **Post**.
2. `FeedTab.publish()` calls `api("/api/communities/2/posts", { method: "POST", body })`.
3. The route handler verifies her JWT, checks she is an *approved member*
   (`isApprovedMember`), validates the content isn't empty, inserts a row into
   `posts`, and calls `notifyCommunity()` — every approved member gets a
   `notifications` row.
4. It returns `{ success: true, data: { post } }`; the UI prepends the post to
   the feed instantly. Other members see a bell badge appear on their next
   page load.

---

## 4. Prerequisites

Install these first, then verify each:

| Tool | Get it | Verify |
|---|---|---|
| **Node.js 20+** (includes npm) | https://nodejs.org (LTS) | `node -v` |
| **Git** | https://git-scm.com/downloads | `git --version` |
| **VS Code** (editor) | https://code.visualstudio.com | opens the folder |
| **PostgreSQL 16** running locally — or a free cloud database (Neon: https://neon.tech) | https://www.postgresql.org/download/ | `psql --version` |
| A REST client (optional) | VS Code "Thunder Client" extension, or Postman (https://www.postman.com) | — |

---

## 5. Folder structure explained

```
hometown-hub/
├── src/
│   ├── app/                      ← PAGES (each folder = one URL)
│   │   ├── page.tsx              │    landing page          →  /
│   │   ├── login/page.tsx        │    login form            →  /login
│   │   ├── register/page.tsx     │    register form         →  /register
│   │   ├── communities/          │    explore, /new, /[id] hub page
│   │   ├── notifications/        │    bell inbox
│   │   ├── profile/              │    view & edit profile
│   │   ├── admin/                │    Platform Admin dashboard
│   │   ├── layout.tsx            │    wraps every page (navbar, providers)
│   │   ├── globals.css           │    Tailwind theme (paper/ink/ember)
│   │   └── api/                  ← BACKEND (each route.ts = one endpoint)
│   │       ├── auth/             │    register · login · me
│   │       ├── users/me/         │    profile update
│   │       ├── communities/      │    list/create · detail · join · requests · members · posts · events
│   │       ├── posts/            │    get/pin/delete · like · comments
│   │       ├── events/           │    edit/delete · rsvp
│   │       ├── notifications/    │    list · mark read
│   │       ├── reports/          │    create · admin queue · resolve
│   │       ├── moderator-applications/
│   │       ├── admin/            │    stats · users management
│   │       ├── categories/       │    public list + admin CRUD
│   │       ├── upload/           │    image upload (Cloudinary / base64)
│   │       └── health/           │    uptime probe (+ DB check)
│   ├── components/               ← reusable UI
│   │   ├── auth-provider.tsx     │    useAuth() context + useRequireAuth()
│   │   ├── navbar.tsx, avatar.tsx, post-card.tsx, toaster.tsx, ui.tsx
│   ├── db/
│   │   ├── schema.ts             │    ALL table definitions + relationships
│   │   └── index.ts              │    the Drizzle database client
│   └── lib/                      ← shared helpers
│       ├── client.ts             │    (browser) api() fetch wrapper + types
│       ├── auth.ts               │    (server) bcrypt + JWT sign/verify
│       ├── session.ts            │    (server) getAuthUser + permission guards
│       ├── http.ts               │    (server) {success,message,data}, validation, rate limit
│       ├── notify.ts             │    (server) notification fan-out
│       └── format.ts             │    (browser) "3 min ago" date helpers
├── scripts/seed.ts               ← demo data (npx tsx scripts/seed.ts)
├── public/images/                ← generated artwork + community covers
├── drizzle.config.json           ← Drizzle's DB connection config
├── .env                          ← secrets for THIS machine (git-ignored)
└── .env.example                  ← template with every variable explained
```

---

## 6. Step-by-step local setup

> New concept — **environment variables**: settings that differ per machine
> (database password, secrets). They live in a `.env` file that is **never**
> committed to git. Copy `.env.example` → `.env` and fill it in.

```bash
# 1. Clone or download the project, then open it
cd hometown-hub

# 2. Create your env file and edit it (see .env.example for explanations)
cp .env.example .env          # on Windows:  copy .env.example .env

# 3. Install dependencies (once)
npm install

# 4. Make sure PostgreSQL is running and DATABASE_URL in .env points at it.
#    Local default: postgresql://postgres:postgres@127.0.0.1:5432/app_db
#    (Create the db first:  psql -U postgres -c "CREATE DATABASE app_db;")
#    …or paste a free Neon/Supabase connection string instead.

# 5. Create the tables in your database
npx drizzle-kit push

# 6. Fill the app with demo data (8 users, 3 hubs, posts, events…)
npx tsx scripts/seed.ts

# 7. Start the app
npm run dev
```

Open **http://localhost:3000** and log in with a demo account below.
(For a production-like run: `npm run build && npm start`.)

### Demo accounts (created by the seed)

| Role | Email | Notes |
|---|---|---|
| Platform Admin | `admin@hometownhub.app` | founded Fort Kochi + Jaisalmer hubs |
| Moderator | `meera@example.com` | founder of Munnar Tea Hills Circle |
| Moderator | `arjun@example.com` | moderator of Fort Kochi (see a pending join request) |
| Member | `priya@example.com` | member of Munnar |
| Members | `rahul@ / sara@ / vikram@ / ananya@example.com` | various memberships |

**Password for all demo accounts:** `Passw0rd!`

### Optional: Cloudinary image storage

Without keys, uploaded images are stored as base64 data URLs in the database
(perfect for learning). For production, get a **free Cloudinary account**:

1. https://cloudinary.com → *Sign up* → Dashboard → *Account Details*.
2. Copy **Cloud Name**, **API Key**, **API Secret** into `.env`.
3. Restart the server — `/api/upload` automatically switches to Cloudinary.

---

## 7. Understanding the database

All tables are defined in **`src/db/schema.ts`** — read it top to bottom, every
column is commented.

```
users ─┬─< community_members >── communities ─┬─< posts ─┬─< post_likes
       │        (join table:                  │           └─< comments
       │         status + communityRole)      └─< events ─< event_attendees
       ├─< notifications                       └─< moderator_applications
       └─< reports (→ postId or commentId)
categories ─< communities        (a community optionally has one category)
```

**Relationship cheat sheet** (`references()` draws the arrows):

- `posts.authorId → users.id` — every post belongs to one author.
- `community_members (communityId, userId)` — the many-to-many "who joined
  which hub" join table, plus `status` (pending/approved/rejected) and
  `communityRole` (creator/moderator/member).
- `post_likes (postId, userId)` is **unique together** → a user can't like
  twice; like/unlike = insert/delete a row.
- `onDelete: "cascade"` means deleting a post also deletes its likes/comments.
- **Cached counters** (`memberCount`, `likeCount`, `commentCount`,
  `attendeeCount`) are updated on every action so list pages never need slow
  `COUNT(*)` queries.
- **Indexes** on `users.email`, `communities.city`, `posts.communityId`,
  `notifications.userId` keep lookups fast at scale.

**Peek at the data** (CLI): `psql $DATABASE_URL` then
`\dt` (list tables), `SELECT name, role FROM users;`,
`SELECT title, "attendeeCount" FROM events;`

---

## 8. Understanding the API

### How one request travels: route → guard → model

`POST /api/communities/2/posts` in `src/app/api/communities/[id]/posts/route.ts`:

1. **Read** the body (`await req.json()`).
2. **Guard:** `getAuthUser(req)` decodes the JWT → user; `isApprovedMember()`
   checks the `community_members` row; strangers get `403`.
3. **Validate:** content or image required; `clean()` trims input.
4. **Model:** `db.insert(posts).values({…})` via Drizzle.
5. **Side effect:** `notifyCommunity(…)` writes one notification per member.
6. **Respond:** `ok({ post }, "Posted!", 201)` → `{ success: true, message, data }`.

Errors everywhere use the same envelope — the frontend just shows `message`.

### Full endpoint table

| Method & path | Access | What it does |
|---|---|---|
| `GET /api/health` | public | Uptime + DB check |
| `POST /api/auth/register` | public *(rate-limited)* | Create account (1st ever user becomes admin); returns JWT |
| `POST /api/auth/login` | public *(rate-limited)* | Verify credentials; returns JWT |
| `GET /api/auth/me` | logged in | Current profile from token |
| `PUT /api/users/me` | logged in | Edit own profile |
| `POST /api/upload` | logged in | Upload image → URL (Cloudinary or base64) |
| `GET /api/communities` | public | Search/filter approved hubs (`q, categoryId, page`); `?member=me` = mine; `?status=…` = admin |
| `POST /api/communities` | logged in | Create hub (starts `pending`) |
| `GET /api/communities/:id` | public* | Detail + my membership + canModerate flag |
| `PATCH /api/communities/:id` | admin: approve/reject · mods: edit | Moderate or update hub |
| `DELETE /api/communities/:id` | admin | Delete hub + all its data |
| `POST /api/communities/:id/join` | logged in | Request to join |
| `DELETE /api/communities/:id/join` | member | Leave (founders can't) |
| `GET /api/communities/:id/requests` | mods | Pending join requests |
| `PATCH /api/communities/:id/requests` | mods | `{membershipId, action: approve\|reject}` |
| `GET /api/communities/:id/members` | public | Approved member list |
| `GET /api/communities/:id/posts` | public | Feed, pinned-first, `?page=&limit=` |
| `POST /api/communities/:id/posts` | approved member | Create post (`announcement` = mods only) |
| `GET /api/posts/:id` | public | One post (shared links) |
| `PATCH /api/posts/:id` | mods | `{action:"pin"}` toggle pin |
| `DELETE /api/posts/:id` | author / mods / admin | Delete post |
| `POST /api/posts/:id/like` | approved member | Toggle like |
| `GET /api/posts/:id/comments` | public | List comments |
| `POST /api/posts/:id/comments` | approved member | Add comment (notifies author) |
| `DELETE /api/comments/:id` | author / mods / admin | Delete comment |
| `GET /api/communities/:id/events` | public | Events + `joinedByMe` |
| `POST /api/communities/:id/events` | approved member | Create event (notifies hub) |
| `PATCH /api/events/:id` | creator / mods / admin | Edit event |
| `DELETE /api/events/:id` | creator / mods / admin | Cancel event |
| `POST /api/events/:id/rsvp` | approved member | Toggle attendance |
| `GET /api/notifications` | logged in | Latest 30 + unread count |
| `PATCH /api/notifications` | logged in | Mark read (`{ids:[]}` or all) |
| `POST /api/reports` | logged in | Report a post or comment |
| `GET /api/reports` | admin | Moderation queue |
| `PATCH /api/reports/:id` | admin | `{action: dismiss\|deleteContent}` |
| `POST /api/moderator-applications` | approved member | Apply to moderate a hub |
| `GET /api/moderator-applications?communityId=` | founder / admin | List applications |
| `PATCH /api/moderator-applications/:id` | founder / admin | `{action: approve\|reject}` |
| `GET /api/admin/stats` | admin | Dashboard totals + 7-day chart |
| `GET /api/admin/users` | admin | Search + paginate users |
| `PATCH /api/admin/users/:id` | admin | Change role / (de)activate |
| `GET /api/categories` | public | Categories + usage counts |
| `POST /api/categories` | admin | Create category |
| `PATCH /api/categories/:id` | admin | Rename |
| `DELETE /api/categories/:id` | admin | Delete |

*"mods" = community founder or moderator, or platform admin.*

### Test it with curl

```bash
# 1. Log in and save the token
TOKEN=$(curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"meera@example.com","password":"Passw0rd!"}' | \
  node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.token))")

# 2. Browse communities (public)
curl -s http://localhost:3000/api/communities | head -c 400

# 3. Create a post in hub #1 (authorized)
curl -s http://localhost:3000/api/communities/1/posts \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"content":"Hello from curl!"}'
```

(Or import these three into Thunder Client / Postman as a mini-collection.)

---

## 9. Understanding the frontend

- **Routing** — folders under `src/app` map to URLs: `communities/[id]/page.tsx`
  → `/communities/42`. No router config needed.
- **State & context** — `AuthProvider` (src/components/auth-provider.tsx) keeps
  the logged-in user + unread count in a React context. Any component calls
  `useAuth()`; protected pages call `useRequireAuth()` which redirects to
  `/login`.
- **Talking to the API** — `api(path, options)` (src/lib/client.ts) is the only
  function that calls `fetch`: it attaches the JWT, sends/receives JSON,
  unwraps `{ success, message, data }` and throws `Error(message)` you can show
  in a toast.
- **Optimistic UI** — likes and RSVPs update instantly, then reconcile with the
  server response (and roll back on error).
- **Loading / empty / error states** — `Spinner`, `SkeletonCards`, `EmptyState`
  from `src/components/ui.tsx` + toasts, used on every list page.
- **Pagination** — feeds use `?page=` with "Load more"; comments load lazily
  only when you open the thread.

---

## 10. Authentication explained simply

1. **Register** — the server hashes your password with **bcrypt** (a one-way
   scramble) and stores only the hash. It creates a JWT: a tamper-proof,
   signed token containing your user id.
2. **Login** — bcrypt compares your attempt with the stored hash; on success
   you get a new JWT. The browser stores it in `localStorage`.
3. **Every request after** — `api()` adds `Authorization: Bearer <JWT>`. Route
   handlers call `getAuthUser()` → verify signature → load your user.
4. **Authorization vs authentication** — being logged in isn't enough for
   everything: `canModerate()` (founder/moderator of that hub, or platform
   admin) and `isApprovedMember()` decide what you're *allowed* to do. That's
   role-based authorization, and it always runs **server-side** (hiding buttons
   in the UI is just politeness — the API enforces it).

---

## 11. Manual testing checklist (per role)

**As a visitor** — open `/`, browse `/communities`, search "Munnar", open a hub,
try to post (should invite you to log in).

**As a Member** (`priya@example.com`):
- [ ] Edit profile (hometown, bio, avatar) on `/profile`
- [ ] Create a community → sees "submitted for review"
- [ ] Join the Jaisalmer hub → "Request pending"
- [ ] Post text + photo in Munnar; like/unlike a post; comment; share (copies link)
- [ ] Create an event; join/leave another event (attendee count moves)
- [ ] Report a post (flag icon → reason)
- [ ] Apply to moderate (About tab → "Become a moderator")
- [ ] Check the bell → `/notifications` → Mark all read

**As a Moderator** (`meera@example.com`):
- [ ] Munnar hub → Moderation tab → approve/reject Vikram's join attempt flow
- [ ] Moderator applications → approve Vikram → he becomes moderator
- [ ] Post an **announcement** (checkbox) → badge shows; pin/unpin it
- [ ] Delete someone's inappropriate comment/post
- [ ] Edit/cancel an event (Events tab)

**As a Platform Admin** (`admin@hometownhub.app`):
- [ ] `/admin` Overview: stat cards + 7-day chart match reality
- [ ] Communities tab → approve the member-created hub (creator gets notified)
- [ ] Users tab → search "sara", deactivate her → she can no longer log in → reactivate
- [ ] Reports tab → see the demo report → dismiss or delete content
- [ ] Categories tab → add "Sports Day 2026", rename, delete

---

## 12. Common errors and fixes

| Symptom | Likely cause → fix |
|---|---|
| `DATABASE_URL is required` | `.env` missing/misnamed → `cp .env.example .env`, restart |
| `ECONNREFUSED 127.0.0.1:5432` / DB connect failed | PostgreSQL isn't running → start the service, or use a Neon URL |
| Seed fails "database … does not exist" | Create it: `psql -U postgres -c "CREATE DATABASE app_db;"` then `npx drizzle-kit push` again |
| "column X does not exist" | Schema changed → run `npx drizzle-kit push` |
| `Port 3000 is already in use` | Something else is on 3000 → `npm run dev -- -p 3001` (or kill the other process) |
| "Not logged in" on every API call | Token missing/expired → log out & in; check `JWT_SECRET` didn't change |
| "Too many login attempts" | Rate limiter did its job → wait 15 min or restart the server |
| Blank page after login | Check browser console; usually an API 500 → read the terminal running `npm run dev` |
| Images fail to upload | Over 2.5 MB or wrong type → use JPG/PNG/WebP under 2.5 MB |
| CORS error (only if you split front/back ends) | This app is same-origin so there is no CORS issue; if you deploy separately, call the API via your own domain or add an allow-list on the server |
| Env var is `undefined` | It must be in `.env` and the server *restarted*; only `NEXT_PUBLIC_*` vars are visible in the browser |

---

## 13. Production preparation

- [ ] `JWT_SECRET` = long random string (`openssl rand -base64 32`)
- [ ] `DATABASE_URL` = managed Postgres (Neon/Supabase/Render) with SSL
- [ ] Cloudinary keys set (images off the DB)
- [ ] `npm run build` passes locally; `npm start` serves it
- [ ] Admin password changed from the seed value
- [ ] Demo report/application removed or reseeded as desired
- [ ] `.env` git-ignored (already covered by the default `.gitignore`)

**Security checklist (already in the code):** bcrypt hashing · JWT expiry (7d) ·
role checks on the server · rate-limited auth routes · input trimming/limits ·
security headers (`next.config.ts`) · unique constraints (no double likes/joins) ·
SQL-injection-proof parameterized queries (Drizzle) · secrets only in env.

---

## 14. Deployment guide

**Easiest production path (free tiers):** Vercel (app + API) + Neon (Postgres).

**A. Database (Neon)**
1. https://neon.tech → *Sign up* → *Create project*.
2. Copy the **pooled connection string** (`postgresql://…?sslmode=require`).
3. Locally: `DATABASE_URL=<neon-url> npx drizzle-kit push` to create tables,
   then `DATABASE_URL=<neon-url> npx tsx scripts/seed.ts` to seed.

**B. App (Vercel)**
1. Push the repo to GitHub (next section).
2. https://vercel.com → *Add New* → *Project* → import the repo (framework
   auto-detected: Next.js).
3. In *Environment Variables*, add `DATABASE_URL` (+ `JWT_SECRET`, Cloudinary).
4. Deploy → you get `https://your-app.vercel.app`.
5. Verify: open `/api/health` (should say `database: connected`), then log in
   and approve a community.

**Alternative hosts:** Render or Railway work too — same three env vars,
build command `npm run build`, start command `npm start`.

*Why no CORS step?* Frontend and API ship from the same origin, so browsers
never make a cross-origin request — nothing to configure.

---

## 15. Git & GitHub basics

```bash
git init
git add .
git status                        # make sure .env is NOT listed
git commit -m "Hometown Hub: full platform (API + UI + seed)"

# create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/hometown-hub.git
git branch -M main
git push -u origin main
```

The default `.gitignore` already excludes `node_modules/`, `.next/` and `.env*`.
**Never commit `.env`** — if you do by accident, change every secret in it.

---

## 16. KPIs & tracking

The Admin Overview tab already queries these; every metric is one SQL aggregate
away because of the cached counters and indexes:

| KPI | Where it lives | How to compute |
|---|---|---|
| Total users | `users` | `count(*)` (shown) |
| Active communities | `communities` | `count(status='approved')` (shown) |
| Community growth | `communities.createdAt` | group by week |
| Posts today / DAU proxy | `posts.createdAt` | `count(created_at >= today)` (shown); DAU = distinct authors per day |
| Engagement rate | `post_likes` + `comments` | (likes+comments) / posts |
| Event participation | `events.attendeeCount` | avg attendees per event |
| Moderation health | `reports.status` | open vs resolved count |

To go further, log a `pageviews` table or plug in a privacy-friendly analytics
tool (e.g. Plausible) — the shape above keeps a DIY dashboard trivial to extend.

---

## 17. Future enhancements

Intentionally **out of scope** for this version, realistic next steps:

- Native mobile app (React Native) reusing the same REST API
- Local marketplace / classifieds inside each hub (jobs, housing, services)
- Emergency & civic alerts (government updates integration)
- AI-assisted moderation for images and text
- Multi-language UI (dialect preservation is a cultural feature!)
- Media galleries & audio archives for oral history
- Email digests ("This week in Munnar")

---

## 18. Learning resources

- **React** — https://react.dev/learn (official tutorial, excellent)
- **Next.js App Router** — https://nextjs.org/learn
- **Drizzle ORM** — https://orm.drizzle.team/docs/get-started-postgresql
- **SQL basics** — https://sqlbolt.com
- **JWT (visual)** — https://jwt.io/introduction
- **Tailwind CSS** — https://tailwindcss.com/docs
- **HTTP/REST** — https://developer.mozilla.org/en-US/docs/Web/HTTP
- **bcrypt & password storage** — https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

---

## 19. Glossary

| Term | Plain meaning |
|---|---|
| **API** | A menu of URLs a program can call to read/change data. |
| **REST** | An API style: URLs are *things* (`/api/posts/5`) and verbs are actions (`GET`, `POST`, `PATCH`, `DELETE`). |
| **Endpoint** | One URL + method combo, e.g. `POST /api/communities/:id/join`. |
| **JWT** | Signed token that proves "who you are" on every request, without server sessions. |
| **Middleware / guard** | Code that runs before a handler to allow/deny a request (here: `getAuthUser`, `canModerate`). |
| **Schema** | The blueprint of your database tables (`src/db/schema.ts`). |
| **ORM** | Library that lets you talk to the database in TypeScript instead of raw SQL (Drizzle). |
| **Foreign key** | A column that points at another table's id — the "arrows" between tables. |
| **Join table** | A table that links two others many-to-many (`community_members`). |
| **Index** | A database shortcut that makes searching a column fast (like a book index). |
| **Hook** | A React function starting with `use` that gives components powers (`useState`, `useAuth`). |
| **Context** | React's shared-state box — provide once, `use…()` anywhere (auth, toasts). |
| **Env variable** | Per-machine secret/config loaded at startup (`.env`), never sent to the browser. |
| **Rate limiting** | Rejecting too-frequent requests (blocks password-guessing bots). |
| **Optimistic UI** | Update the screen instantly, then confirm with the server (used by likes/RSVP). |
| **Pagination** | Loading data in pages ("Load more") instead of all at once. |
| **Seed script** | A script that fills an empty database with demo data. |
| **SSR / Client component** | Next.js renders on the server by default; `"use client"` marks components that need browser interactivity. |

---

Built as a beginner-friendly learning project — read `src/db/schema.ts` first,
then follow one request through `src/lib/client.ts → src/app/api/… → schema.ts`.
That's the whole app.
