# 5. Technical Architecture

## 5.1 Architecture decision

Build a full-stack Next.js application with MongoDB as the primary persistent database.

Recommended stack:
- Next.js App Router.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Lucide icons.
- MongoDB (MongoDB Atlas recommended; local MongoDB supported for development).
- Mongoose for schemas, indexes and model access (the official MongoDB Node.js driver is an acceptable alternative if used consistently).
- Next.js Route Handlers or Server Actions for mutations and server-side data access.
- Zod for runtime validation at all input boundaries.
- Zustand only for transient client/UI state where useful.
- Recharts for analytics.
- A maintained Markdown editor such as CodeMirror/TipTap with Markdown support.
- A safe Markdown renderer with sanitization.
- date-fns for date handling.

MongoDB is the source of truth for roadmap progress, resources, challenges, attempts, mocks, notes, reports, study sessions, revisions and settings. Do not use Dexie/IndexedDB as the primary database. Do not expose database credentials or perform database queries in client components.

## 5.2 Suggested project structure

```text
hackquest-prep/
├── app/
│   ├── api/
│   │   ├── roadmap/
│   │   ├── resources/
│   │   ├── challenges/
│   │   ├── mocks/
│   │   ├── notes/
│   │   ├── reports/
│   │   ├── analytics/
│   │   └── settings/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── roadmap/
│   ├── resources/
│   ├── challenges/
│   ├── mocks/
│   ├── analytics/
│   ├── weaknesses/
│   ├── notes/
│   ├── reports/
│   ├── readiness/
│   └── settings/
├── components/
│   ├── layout/
│   ├── dashboard/
│   ├── roadmap/
│   ├── resources/
│   ├── challenges/
│   ├── mocks/
│   ├── notes/
│   ├── reports/
│   └── ui/
├── features/
│   ├── roadmap/
│   ├── resources/
│   ├── challenges/
│   ├── mocks/
│   ├── notes/
│   ├── analytics/
│   └── reports/
├── lib/
│   ├── db/
│   │   ├── mongodb.ts
│   │   └── models/
│   ├── repositories/
│   ├── services/
│   ├── validation/
│   ├── analytics/
│   ├── dates/
│   ├── export/
│   └── utils/
├── data/
│   ├── seed-roadmap.ts
│   ├── seed-resources.ts
│   └── seed-challenges.ts
├── docs/
├── tests/
├── .env.example
└── README.md
```

Adapt to the repository if one already exists. Do not blindly overwrite existing work.

## 5.3 Data flow

Client components -> Route Handlers or Server Actions -> validation/service layer -> repository layer -> MongoDB.

- All MongoDB access must happen in server-only modules.
- Use typed repository methods; UI components must not import Mongoose models or database utilities.
- Validate request bodies and query parameters with Zod.
- Return serializable DTOs; do not pass raw Mongoose documents to client components.
- Handle ObjectId values consistently and serialize them as strings at the API boundary.
- Use appropriate HTTP status codes and structured error responses.
- Derive analytics from persisted MongoDB records.
- Seed initial content once using an idempotent seed script; never reseed on every page load.
- Add indexes for common filters and relationships.
- Keep seed/schema version information and document migrations.

## 5.4 MongoDB connection and configuration

- Read `MONGODB_URI` and optional `MONGODB_DB` from environment variables.
- Provide `.env.example` with placeholders only; never commit real credentials.
- Create a cached connection utility suitable for Next.js development hot reload so repeated requests do not open unlimited connections.
- Mark database modules as server-only where supported.
- Fail with a clear configuration error if required environment variables are missing.
- Never log the full connection string or secrets.
- Support MongoDB Atlas and local MongoDB connection strings.
- Use least-privilege database credentials.
- Add connection timeout and error handling.
- Do not place `MONGODB_URI` in any `NEXT_PUBLIC_` variable.

## 5.5 Persistence and data modelling

Use MongoDB collections for:
- settings
- roadmapDays
- learningTasks
- resources
- challenges
- challengeAttempts
- mockSessions
- mockChallengeResults
- noteFolders
- notes
- attachments (metadata; store file bytes using an explicitly chosen storage strategy)
- practiceReports
- studySessions
- revisionItems

Use separate collections for records that can grow independently (notes, attempts, reports, tasks). Use references/ObjectIds for relationships rather than embedding unbounded arrays. Embed only small, bounded value objects where appropriate. Add `createdAt` and `updatedAt` timestamps. Define indexes for lookup, filtering and sorting. Choose and document deletion behavior for related records.

For note attachments, do not store arbitrarily large binary files directly in ordinary documents. For the initial version, either store small files in MongoDB GridFS or store metadata plus a configurable object-storage adapter; choose one approach, implement it end-to-end, and document limits. Do not create a fake upload UI.

## 5.6 Backup and restore

Export:
- Versioned JSON backup with schema version, export timestamp and all application records.
- Optional Markdown export for notes.
- Optional CSV for attempts and tasks.

Import:
- Validate schema version and every record with Zod.
- Show a preview/count before import.
- Offer merge or replace modes.
- Prevent accidental overwrite with confirmation.
- Use transactions where supported for multi-collection consistency; handle standalone MongoDB deployments gracefully.
- Report invalid records clearly.
- Never execute imported content.

Also document how to create a MongoDB Atlas backup or `mongodump` backup. The app-level JSON export remains useful for portable user data.

## 5.7 Offline and PWA

MongoDB-backed writes require a network connection. Do not claim full offline functionality in this version.
- The UI may cache static assets and non-sensitive read-only shell content.
- If offline, show a clear connection state and preserve unsent editor text temporarily where practical.
- Do not silently discard edits when a request fails.
- Add PWA support only after core functionality is stable.
- External learning resources require internet.

## 5.8 Security and privacy

- Initial version is intended for private single-user use.
- Do not expose an unauthenticated app publicly. If deployment is public or internet-accessible, add authentication and authorization before deployment.
- Keep MongoDB credentials on the server only.
- Validate and authorize every mutation server-side.
- Apply reasonable request size limits and input validation.
- Sanitize Markdown output.
- Validate file types and sizes for attachments.
- Avoid unsafe HTML injection and NoSQL query injection; never pass untrusted objects directly as MongoDB filters or update operators.
- Use safe external link attributes.
- Do not transmit user notes or challenge data to third parties except to the configured database.
- Do not store passwords, TCS credentials or real contest account secrets.
- Do not implement live contest automation.

## 5.9 Testing

- Unit test date/countdown calculations.
- Unit test analytics and readiness calculations.
- Test MongoDB connection utility and repository methods using a test database or mongodb-memory-server.
- Test Zod validation and API error handling.
- Test note autosave, request failure recovery and conflict behavior.
- Test backup import/export.
- Test mock timer persistence after reload.
- Test responsive navigation.
- Add end-to-end smoke tests for key flows.

## 5.10 Performance

- Reuse a cached MongoDB connection.
- Add indexes for frequent filters and sort orders.
- Paginate challenge, note and attempt lists.
- Avoid loading every note body for the notes list; fetch the selected note body separately.
- Lazy-load heavy editor and chart modules.
- Keep dashboard aggregation queries efficient.
- Use projections to fetch only needed fields.
- Keep initial bundle reasonable.
