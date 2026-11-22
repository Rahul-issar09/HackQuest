# FounderLink

**A LinkedIn-style platform where founders pitch startups and investors discover, evaluate, and connect with them, with confidential documents protected at every step.**

![Status](https://img.shields.io/badge/status-in%20development-blue)
![Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20Node.js%20%7C%20MongoDB-0A66C2)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions-success)

---

## Why FounderLink?

Founders need to share patents, legal papers, and financials to raise money, but emailing them around is risky and untraceable. Investors need one place to compare startups and ask for proof. FounderLink solves both:

- Founders decide **who can open which document**.
- Investors get documents through **short-lived signed links**, never a public URL.
- Admins verify every user and startup, and every document access is **logged**.

---

## Features

### Built and tested

| Area | What it does |
|---|---|
| **Three roles only** | Founder, Investor, and Admin, enforced on every route (RBAC) |
| **Authentication** | Register, login, refresh tokens in httpOnly cookies, email verification, password reset, account lockout after 5 failed logins, suspended-user blocking |
| **Founder module** | Profile and avatar, startup CRUD (own startups only), multi-step "Post your startup" form, document upload (PDF, DOCX, PNG, JPG, max 20 MB), per-document access level, request inbox with approve/reject |
| **Document security** | Three access levels: `public`, `locked` (needs approval), `approved_only`. Files open only through **5-minute signed links**. Investors never see file URLs in API responses. |
| **Investor module** | Approved-only startup feed with search, industry/stage/funding filters, sorting and pagination. Watchlist, access requests, connection requests |
| **Admin module** | Approval queue for users and startups (with rejection reasons), suspend/reactivate users, content moderation, platform stats, filterable audit logs |
| **Connections** | Investors request a connection to a startup. Only the founder can accept or decline. Duplicates are blocked |
| **Quality** | 100+ automated tests (Jest, Supertest, Vitest) and GitHub Actions CI with MongoDB and Redis service containers |

### In progress

- Real-time chat between connected founders and investors (Socket.io)

### Planned

- Meeting room with scheduling (Jitsi)
- Shared monitoring dashboard (revenue, users, milestones, fund usage) with charts
- LinkedIn-style UI polish, mobile-first layout
- Production deployment

---

## Roadmap: ideas that make it smarter

These are planned features, chosen because each solves a real problem in fundraising.

| Feature | Why it helps |
|---|---|
| **Startup readiness score** | A 0 to 100 score based on profile completeness, documents uploaded, and team details. Pushes founders to post better pitches and helps investors filter. |
| **Investor-startup match score** | Compare an investor's interests and ticket size with a startup's industry, stage, and funding ask, then rank the feed by fit. |
| **Dynamic watermarking** | Stamp the investor's name and the time on every PDF they open. Discourages leaks and makes them traceable. |
| **NDA gate** | Require an electronic NDA acceptance before a locked document is released. Stored with the audit log. |
| **Access expiry and revoke** | Founders can set approvals to expire after N days, or revoke access in one click. |
| **Data room analytics** | Show founders which documents an investor viewed and for how long, without exposing personal data. |
| **Deal pipeline** | Stages for each connection: Interested, Reviewing, Due diligence, Term sheet, Closed. Both sides see progress. |
| **Due diligence checklist** | A shared checklist (legal, financial, IP, team) that links to the relevant documents. |
| **Milestone-based updates** | Founders log milestones and fund usage monthly. Investors get a notification on each update. |
| **Email and in-app notifications** | Alerts for access requests, approvals, new messages, and meeting reminders. |
| **Two-factor authentication** | Email OTP for all users, mandatory for admins. |
| **Fraud and abuse checks** | Rate limits, duplicate-startup detection, and a report button that sends content to the admin queue. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, TypeScript, REST API |
| Real-time | Socket.io |
| Database | MongoDB with Mongoose |
| Cache and sessions | Redis |
| Auth | JWT (access and refresh), bcrypt, role-based access control |
| File storage | Local disk in development, Cloudflare R2 or AWS S3 in production |
| Testing | Jest, Supertest, Vitest, React Testing Library |
| CI | GitHub Actions |

---

## How It Works

```
Sign up -> Admin approves account -> Founder posts startup -> Admin approves startup
   -> Investor finds it in the feed -> Requests access to protected documents
   -> Founder approves -> Investor opens the file through a 5-minute signed link
   -> Connection request -> Founder accepts -> Private chat (and later meetings and a shared dashboard)
```

---

## Project Structure

```
founderlink/
├── client/                  # Next.js frontend
│   └── src/
│       ├── app/             # Pages (login, register, dashboards)
│       ├── components/      # founder/, investor/, admin/
│       └── lib/             # API helpers
├── server/                  # Express backend
│   └── src/
│       ├── controllers/     # Request handlers
│       ├── models/          # Mongoose models
│       ├── routes/          # API routes
│       ├── middleware/      # Auth, uploads, error handler
│       ├── services/        # Storage, auth logic
│       └── tests/           # Jest tests
├── .github/workflows/       # CI pipeline
└── .agent/rules/            # Project rules for the AI coding agent
```

---

## Getting Started

### Prerequisites

- Node.js 24 or newer
- MongoDB (local or Atlas)
- Redis (local, Docker, or Upstash)

### 1. Clone and install

```bash
git clone https://github.com/raunakkhan17/founderlink.git
cd founderlink

cd server && npm install
cd ../client && npm install --legacy-peer-deps
```

### 2. Configure environment variables

```bash
cd server
cp .env.example .env     # Windows: copy .env.example .env
```

Then edit `server/.env`:

| Variable | Description |
|---|---|
| `PORT` | API port (default 5000) |
| `CLIENT_URL` | Frontend address (default http://localhost:3000) |
| `MONGO_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Long random strings. **Never reuse the example values.** |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Initial admin account. **Set your own strong password.** |
| `STORAGE_*` | Cloudflare R2 or S3 settings (not needed in development) |

### 3. Create the admin account

```bash
cd server
npx tsx src/scripts/seedAdmin.ts
```

### 4. Run the app

```bash
# Terminal 1: API
cd server
npm run dev

# Terminal 2: website
cd client
npm run dev
```

Open http://localhost:3000 and check the API at http://localhost:5000/api/health.

> **Windows note:** if Windows blocks the native Next.js file ("Application Control policy has blocked this file"), run the client with `npm run dev -- --webpack`.

---

## Running Tests

```bash
# Backend (needs MongoDB and Redis running)
cd server
npm test

# Frontend
cd client
npm run test

# Type check and lint
npx tsc --noEmit
npm run lint
```

Tests use a separate database (`founderlink_test_models`), so they never touch your development data.

---

## API Overview

| Area | Examples |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/auth/me` |
| Startups | `POST /api/startups`, `GET /api/startups` (investor feed), `GET /api/startups/:id`, `PUT /api/startups/:id` |
| Documents | `POST /api/startups/:id/documents`, `PUT /api/documents/:id/access-level`, `DELETE /api/documents/:id` |
| File access | `GET /api/files/open/:id` (returns a 5-minute signed link) |
| Access requests | `POST /api/access-requests`, `GET /api/access-requests/mine` |
| Connections | `POST /api/connections`, `GET /api/connections/my`, `PUT /api/connections/:id/status` |
| Admin | `GET /api/admin/pending/users`, `PUT /api/admin/pending/startups/:id`, `GET /api/admin/audit-logs`, `GET /api/admin/stats` |

---

## Security Notes

- Passwords are hashed with bcrypt, and accounts lock for 15 minutes after 5 failed logins.
- Refresh tokens live in httpOnly cookies. Access tokens expire after 15 minutes.
- Admin accounts cannot be self-registered.
- Founders can only edit their own startups and documents.
- Document links are short-lived, and every open is written to the audit log.
- Stack traces are hidden when `NODE_ENV=production`.
- Uploaded files are never committed. `server/uploads/` and `.env` are git-ignored.

**Before deploying:** change all default secrets and the admin password, set cookies to `Secure`, serve everything over HTTPS, and move file storage to R2 or S3 with private buckets.

---

## Contributing

1. Fork the repository and create a branch (`git checkout -b feature/my-feature`).
2. Make your change and add tests.
3. Run `npx tsc --noEmit`, `npm run lint`, and `npm test`.
4. Open a pull request.

---

## License

Add a `LICENSE` file (for example MIT) before making the repository public.

---

## Author

**Raunak Khan**
GitHub: [@raunakkhan17](https://github.com/raunakkhan17)
