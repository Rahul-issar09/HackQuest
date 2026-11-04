# HackQuest Prep

Private, single-user cybersecurity preparation tracker for **TCS HackQuest Season 11 Round 1** (primary target: Intermediate; Beginner and Expert practice supported). It is an organiser, learning tracker, CTF attempt tracker, local mock simulator, note-taking system, report builder and personal analytics dashboard.

> Independent personal preparation tool. Not affiliated with or endorsed by Tata Consultancy Services.
> It is **not** a CTF platform, never talks to the live HackQuest platform, and contains no exploit or attack tooling. The 31-day roadmap is a recommendation, not an official syllabus. See *Settings → Sources & assumptions* for what TCS actually states versus preparation advice.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS · Lucide icons · MongoDB + Mongoose · Zod · Recharts · react-markdown (+ GFM, rehype-sanitize, highlight.js) · date-fns · Vitest · Playwright (smoke test only).

## Quick start

Requirements: Node 20+ and a MongoDB (Atlas or local).

```bash
npm install
cp .env.example .env.local       # then set MONGODB_URI (and optionally MONGODB_DB)
npm run dev                      # http://localhost:3000
```

The first request creates settings and seeds the roadmap (31 days, tasks), 11 resources, 13 catalogue challenges, 11 note folders and 3 suggested mock sessions. Seeding is idempotent and claimed atomically (`settings.seedVersion`), so it never repeats on later requests. You can also run it manually: `npm run seed`.

### Don't have MongoDB?

* **Atlas:** create a free cluster, add a least-privilege database user, put the connection string in `.env.local`.
* **Docker:** `docker run -d -p 27017:27017 -v hq-data:/data/db mongo:7` and use `mongodb://127.0.0.1:27017`.
* **No install:** `npm run db:dev` starts a persistent local MongoDB (via `mongodb-memory-server`, data in `./.mongo-data`, git-ignored; first run downloads the MongoDB binary, ~800 MB).

### Commands

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server, production build, production server |
| `npm run lint` · `npm run typecheck` | ESLint, `tsc --noEmit` |
| `npm test` | Unit tests (dates, timer, analytics) and MongoDB integration tests (seed, repository, backup round-trip, concurrency, deletion rules) using `mongodb-memory-server` |
| `npm run test:e2e` | Real-browser smoke test (needs Chrome or Edge and a running app: `BASE_URL=http://localhost:3000`) |
| `npm run seed` | Run the idempotent seed against `MONGODB_URI` |

## Features

| Area | What works |
|---|---|
| **Dashboard** | Countdown to the configured exam date, today's mission checklist, study timer, completion %, solved/attempt totals, weekly study time, upcoming mock, category chart, recommendations, recent notes/unsolved attempts. Everything is derived from stored data; empty data shows *not assessed*, never a fake 0%. |
| **Learning Roadmap** | 31 seeded days (Nov 4 – Dec 4, 2026) as timeline or calendar; day detail with objectives, topics, relevance label, resources, checklist, linked notes; add/delete tasks, edit days, **reschedule** (original date preserved), **restore default roadmap** (confirmed). |
| **Resource Library** | Search + filters (category/type/difficulty/status/favourites), add/edit/delete, favourites, status, link to roadmap days, safe external links. |
| **CTF Challenges** | Challenge CRUD, multiple attempts per challenge (time, hints, result, lessons, evidence refs, optional points), filters, pagination, archive, **retry queue** with priority/date (items leave when a later attempt is solved; history kept), links to notes and reports. |
| **Mock CTF Arena** | Create mocks (default 6 h, suggested Nov 16/Nov 26/Dec 2 seeded), choose challenge set, start/pause/resume/finish/discard. The timer is computed from stored timestamps so it survives reload; expiry never deletes data; leaving an active mock warns. Finishing records challenge attempts and shows post-mock analysis (user-configured points only). |
| **Performance Analytics** | Attempts vs unique challenges, solve rate, first-attempt rate, mean + median solve time, category/difficulty tables and charts, mock trend, study trend, with the exact metric definitions shown. |
| **Weakness Analysis** | Transparent rules (low solve rate, repeated failures, slow solves, not-assessed domains, strong with minimum sample). Each recommendation expands to the supporting attempts and can be added to revision items. |
| **My Notes** | Three-pane layout (folders/tags · list · editor; panes become tabs on mobile). Markdown editor with toolbar, edit/split/preview, syntax-highlighted code blocks, **autosave** (800 ms debounce, visible Saving/Saved/Failed state, Ctrl+S), automatic retry with backoff, local draft backup + restore, optimistic-concurrency conflict resolution, unsaved-change guards, nested folders, tags, pin, favourite, search (title + body + tags), sorting, links to days/challenges/resources/mocks, attachments (GridFS), export one/all as Markdown, confirmed delete. |
| **Report Builder** | Practice report fields from the PRD, challenge/attempt linking, preview, Markdown export, print-to-PDF, and a prominent notice to use the **official TCS template and size limit** during the real contest. |
| **Readiness Score** | Personal readiness with visible formula, weights and per-component evidence; components without data are excluded (not counted as zero). Never framed as a qualification probability. |
| **Settings** | Start/exam dates, daily target, primary difficulty, theme, sample size, readiness weights; Sources & assumptions panel; JSON backup export, validated import with preview, merge/replace; CSV/Markdown exports; restore roadmap, reset seeded content, full reset (typed confirmation). |

## Architecture

```
app/                    Next.js pages (client UIs) and Route Handlers (app/api/**)
components/             ui primitives, layout shell, charts, markdown renderer
features/notes/         note editor (autosave, conflicts, attachments)
lib/db/                 cached Mongo connection, Mongoose models (server-only)
lib/server/             repository (validation, whitelisted filters, cascades), seed, backup, GridFS
lib/validation/         Zod schemas (single source of truth for inputs and backups)
lib/analytics/          pure metric, weakness and readiness functions
lib/mock/timer.ts       timestamp-based timer maths and state transitions
lib/dates/              date/countdown helpers
data/                   versioned seed content (roadmap, resources, challenges)
tests/                  unit, integration and e2e smoke tests
```

Data flow: client components → `fetch /api/*` → `route()` wrapper (connect, one-time seed, error mapping) → Zod validation → repository → MongoDB. Client code never imports Mongoose or `MONGODB_URI`; raw documents are converted to DTOs (`id` strings, ISO dates) at the API boundary.

### Conventions

* **Dates:** timestamps are BSON `Date` and ISO strings in DTOs. Calendar-day fields (roadmap dates, start/exam dates) are stored at UTC midnight and compared by their `YYYY-MM-DD` prefix, so countdowns do not shift by timezone.
* **IDs:** MongoDB ObjectIds internally, 24-hex strings at the boundary. References are validated before linking.
* **API:** `GET/POST /api/{collection}`, `GET/PATCH/DELETE /api/{collection}/{id}`. Filters, sorts and search are whitelisted per collection (no client-supplied filters/operators reach MongoDB; search text is regex-escaped). Plus `/api/settings`, `/api/analytics`, `/api/mockSessions/{id}/action`, `/api/attachments`, `/api/backup`, `/api/backup/import`, `/api/admin`, `/api/export/notes`, `/api/health`. Note lists exclude the body (projection); the body is fetched per note.
* **Schema versioning:** `SCHEMA_VERSION` (backups, settings) and `SEED_VERSION` (seed claim) in `lib/constants.ts`. Bumping `SEED_VERSION` re-runs the idempotent seed once. Migrations go next to the seed code; v1 needs none.
* **Deletion rules:** deleting a roadmap day deletes its tasks and unlinks resources/challenges/notes; a resource is unlinked from tasks/notes; a challenge deletes its attempts and mock results and unlinks notes, mocks and reports (reports are kept); a mock deletes its results and the attempts recorded from it; a folder moves its notes and subfolders up one level; a note deletes its attachments. Archive challenges to keep history.
* **Concurrency:** note saves send the `lastSavedAt` they last saw; a stale save returns `409` and the editor offers *keep mine* or *load theirs* instead of silently overwriting.
* **Transactions:** multi-document operations are written to be safely re-runnable (upserts / idempotent replace) so they work on standalone MongoDB without transactions.
* **Note search:** case-insensitive substring match over title, body and tags (regex-escaped). Fine for a personal library; it does not rank results or stem words.

### Attachments

Files go to MongoDB **GridFS** (`attachments` bucket) with metadata in `attachments`. Limits: 5 MB, types PNG/JPEG/GIF/WebP/PDF/plain text/Markdown (server-validated). Files are served with `nosniff`, a locked-down CSP and `Content-Disposition: attachment` for non-images. JSON backups include attachment *metadata only* (not bytes) — use `mongodump`/Atlas backups for those.

## Data persistence and backup

All data lives in your MongoDB database (`MONGODB_DB`, default `hackquest_prep`). It persists across refreshes and restarts. With `npm run db:dev` it persists in `./.mongo-data`. Writes need a connection to MongoDB; if it drops, editors keep unsent text (notes also keep a local draft) and show an error instead of discarding edits. The app is **not** an offline PWA.

* **In-app backup:** Settings → *Export JSON backup* (versioned, all records). Restore with *Choose backup file* → preview counts and validation errors → **Merge** or **Replace** (replace needs typing `REPLACE`). Nothing is imported if any record is invalid.
* **Full database backup:** `mongodump --uri "$MONGODB_URI" --db hackquest_prep --out backup/` (restore with `mongorestore`), or enable Atlas Cloud Backup. This also covers attachment bytes.
* **Other exports:** all notes as one Markdown file, each note individually, attempts and tasks as CSV, reports as Markdown/PDF.

## Security and privacy

* Single user, **no authentication in v1**. Keep it on localhost or a private network. Add authentication and authorization before exposing it publicly.
* `MONGODB_URI` is server-only (never `NEXT_PUBLIC_`) and never logged. Use a least-privilege database user.
* Zod validates every request body and backup record; filters are whitelisted; raw HTML in Markdown is not parsed and output is sanitized; links open with `rel="noopener noreferrer"`; request sizes and attachment type/size are limited.
* No TCS credentials or real contest flags are requested or stored, and nothing automates the live contest.

## Known limitations

* No login/multi-user, no cloud sync, no offline writes, no PWA (optional P2).
* Report "evidence" is a structured text field (file name + timestamp); screenshots can be attached to notes but not directly to reports.
* PDF export uses the browser print dialog ("Save as PDF"), not a server-side renderer.
* JSON backups do not contain attachment bytes.
* Streaks/achievements and spaced-repetition scheduling (P2) are not implemented; weakness recommendations can create simple revision items.
