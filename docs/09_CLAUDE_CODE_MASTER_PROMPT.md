# Claude Code Master Build Prompt

You are the senior full-stack engineer responsible for building **HackQuest Prep**, a polished, working, private, single-user cybersecurity preparation tracker.

## Mandatory first step

Before writing code:
1. Inspect the current repository, package manager, existing app structure and installed dependencies.
2. Read every document in the `docs/` folder, especially:
   - `01_PRODUCT_REQUIREMENTS.md`
   - `02_TCS_RULES_AND_CONTENT_BOUNDARIES.md`
   - `03_LEARNING_ROADMAP.md`
   - `04_FEATURE_SPECIFICATIONS.md`
   - `05_TECHNICAL_ARCHITECTURE.md`
   - `06_DATA_MODEL.md`
   - `07_UI_UX_DESIGN_SYSTEM.md`
   - `08_ACCEPTANCE_CRITERIA_AND_TEST_PLAN.md`
3. Treat those documents as the product source of truth.
4. If the repository already contains work, preserve it and integrate carefully. Do not overwrite or delete files without understanding them.
5. Create an implementation plan and a checklist in `IMPLEMENTATION_STATUS.md`.

## Product objective

Build a private, single-user, MongoDB-backed application named **HackQuest Prep** for preparing for TCS HackQuest Season 11 Round 1. The user's primary target is Intermediate difficulty, while the application must support Beginner and Expert preparation too.

The app is an organiser, learning tracker, CTF attempt tracker, local mock simulator, note-taking system, report builder and personal analytics dashboard. It is not a live CTF platform.

## Non-negotiable requirements

- Use the documents in `docs/` as the source of truth.
- Do not invent official TCS exam facts, scoring, pass marks, number of flags, challenge distribution or guaranteed topics.
- Clearly distinguish officially mentioned Round 1 topics from supplementary preparation and later-round topics.
- Do not interact with, scrape, automate, submit to or tamper with the live HackQuest contest platform.
- Do not build exploit automation or attack functionality.
- Use MongoDB as the primary database. Keep the first version private and single-user; do not expose it publicly without authentication.
- Use MongoDB-backed persistence with MongoDB or an equivalent robust solution.
- All analytics must derive from persisted user activity.
- Notes must autosave and survive refresh.
- The mock timer must survive reload by calculating remaining time from timestamps.
- All core buttons and forms must work; no decorative dead controls.
- Include loading, empty, success and error states.
- Responsive desktop and mobile design.
- No fake progress or fake user activity.

## Technology direction

Use:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide icons
- Mongoose / IndexedDB
- Zustand where useful
- Zod validation
- Recharts
- Markdown editor and safe Markdown renderer
- date-fns

Inspect existing dependencies before installing replacements. Use compatible stable versions. Avoid unnecessary packages.

## Design direction

Create a premium, professional dark cybersecurity dashboard:
- Deep navy/charcoal surfaces.
- Restrained electric-blue accent.
- Green/amber/red semantic statuses.
- Clean typography and strong spacing.
- Sidebar navigation on desktop.
- Responsive drawer/navigation on mobile.
- No excessive neon, glow or gimmicky hacker visuals.

Navigation:
1. Dashboard
2. Learning Roadmap
3. Resource Library
4. CTF Challenges
5. Mock CTF Arena
6. Performance Analytics
7. Weakness Analysis
8. My Notes
9. Report Builder
10. Readiness Score
11. Settings

## Required implementation phases

### Phase 0 — Repository audit and plan
- Inspect repository.
- Read all docs.
- Write implementation plan.
- Identify environment assumptions.
- Report any genuine blockers, but do not ask the user questions for decisions already specified in docs.

### Phase 1 — App foundation
- Set up app shell, theme, sidebar, top bar and responsive layout.
- Create reusable components.
- Configure typed models, validation and local database.
- Add versioned seed process.

### Phase 2 — Seed content and dashboard
- Seed all 31 roadmap days from the roadmap document.
- Seed the listed learning resources.
- Add official/supplementary/later-round/unverified relevance labels.
- Build dashboard using real derived data.
- Countdown dates must be configurable.

### Phase 3 — Roadmap and resources
- Implement roadmap timeline/calendar/day detail.
- Implement daily task checklist and rescheduling.
- Implement resource search, filtering, bookmarks and completion.
- Persist all changes.

### Phase 4 — Challenge tracker
- Implement challenge CRUD and multiple attempt records.
- Add category/difficulty/status filters.
- Add retry queue.
- Record time, hints, result and lessons learned.
- Link notes and reports.

### Phase 5 — My Notes
This is a first-class core feature, not a placeholder.
- Build a dedicated Notes page.
- Three-pane desktop layout where practical: folders, note list, editor.
- Mobile-friendly list/editor navigation.
- Markdown editing and preview.
- Autosave with visible saving/saved/error status.
- Folder hierarchy, tags, search, pin and favourite.
- Code blocks with syntax highlighting.
- Link notes to roadmap days, challenges, resources and mocks.
- Export Markdown.
- Sanitize rendered content.
- Never silently discard unsaved changes.

### Phase 6 — Mock CTF Arena
- Create mock sessions.
- Default duration six hours.
- Seed suggested mock dates Nov 16, Nov 26 and Dec 2, 2026.
- Persist timer state using timestamps.
- Track challenge outcomes and user-configured points.
- Produce post-mock analysis.
- Do not represent mock scores as official TCS scores.

### Phase 7 — Reports and analytics
- Build practice report editor and Markdown export.
- Implement category/difficulty analytics.
- Implement explainable weakness recommendations.
- Implement readiness formula from PRD.
- Clearly label readiness as a personal preparation metric.

### Phase 8 — Settings, backup and polish
- Editable start/exam dates and study target.
- Versioned JSON backup export/import.
- Merge/replace with validation and confirmation.
- Responsive and accessibility review.
- Error handling and empty states.
- Optional PWA only after core functionality works.

### Phase 9 — Testing and handoff
- Run lint, typecheck, unit tests and build.
- Fix all errors.
- Test core flows from acceptance criteria.
- Update README with setup, commands, architecture, data persistence and backup instructions.
- Update `IMPLEMENTATION_STATUS.md`.
- Summarise what works, what remains and how to run it.

## Engineering standards

- Use strict TypeScript; avoid `any`.
- Keep components small and feature-oriented.
- Separate UI from data repositories.
- Validate data at boundaries.
- Use stable IDs.
- Centralise date calculations and analytics.
- Use accessible semantic HTML.
- Avoid duplicate sources of truth.
- Do not seed repeatedly on every render.
- Add error boundaries where appropriate.
- Do not leave TODOs for core requirements.
- Never claim a feature is complete if it is only a static mockup.

## Execution behaviour

Work autonomously through the phases. Do not stop after generating a plan or a pretty dashboard. Implement a complete usable application.

After each phase:
1. Run relevant checks.
2. Fix failures.
3. Update `IMPLEMENTATION_STATUS.md`.
4. Continue to the next phase.

If context or time is limited, prioritise a fully working vertical slice and then continue. Do not replace functionality with decorative placeholders.

At the end, provide:
- Features implemented.
- Files/architecture created.
- Commands to install and run.
- Test/build results.
- Known limitations.
- Confirmation that data persists locally and how to back it up.

Begin by inspecting the repository and reading all project documents.
