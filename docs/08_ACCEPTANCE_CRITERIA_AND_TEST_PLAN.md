# 8. Acceptance Criteria and Test Plan

## 8.1 Global acceptance

- App runs locally using documented commands.
- No TypeScript errors.
- No browser console errors in primary flows.
- Layout works at desktop, tablet and mobile widths.
- Seed data loads once and remains editable.
- Data persists after refresh and browser restart (same browser profile).
- Backup export and restore work.
- Empty/loading/error states exist.
- No dead buttons or placeholder links in core features.

## 8.2 Dashboard tests

1. First launch shows seeded roadmap and zero actual activity.
2. Countdown uses configured exam date.
3. Completing a task updates completion percentage.
4. Logging a solved challenge updates challenge totals.
5. No-data analytics show "not assessed" or an explanatory empty state.

## 8.3 Roadmap tests

1. All 31 days from Nov 4 to Dec 4, 2026 are seeded.
2. Dates and tasks are editable.
3. Marking a task complete persists after refresh.
4. Rescheduling does not duplicate or lose the task.
5. Restoring defaults requires confirmation.

## 8.4 Resource tests

1. Search finds resources by title.
2. Filters work by category/type/difficulty.
3. User can add, edit and delete a custom resource.
4. External links open safely.
5. Completion and favourites persist.

## 8.5 Challenge tracker tests

1. User can create a challenge.
2. User can record multiple attempts for one challenge.
3. User can mark an attempt solved/failed.
4. Attempt duration and hints are stored.
5. Retry queue includes failed/unsolved items.
6. Analytics correctly distinguish attempts from unique challenges.

## 8.6 Mock arena tests

1. User can create a six-hour mock.
2. Timer continues correctly after reload.
3. Pause/resume and finish work.
4. Challenge results are stored.
5. Mock summary reflects actual recorded results.
6. Timer expiry does not silently delete data.

## 8.7 Notes tests

1. User can create a note and folder.
2. Markdown content persists after refresh.
3. Autosave state is visible.
4. Failed save is not silently discarded.
5. Search finds note title and content.
6. Tags, pin and favourite work.
7. Notes can link to a challenge and roadmap day.
8. Exported Markdown contains note content.
9. Delete requires confirmation.

## 8.8 Report tests

1. User can create a report.
2. Report can link to challenge and attempt.
3. Methodology and evidence fields persist.
4. Markdown export works.
5. PDF export is readable if implemented.
6. App warns that official TCS template and current size limit must be checked for the actual event.

## 8.9 Analytics and readiness tests

1. Category metrics use recorded attempts.
2. Missing data is not labelled as poor skill.
3. Repeated failures generate explainable recommendations.
4. Readiness score displays weights and formula.
5. Mock results affect mock component only.
6. No claim of official qualification probability appears.

## 8.10 Backup tests

1. Export creates a versioned JSON file.
2. Import validates schema.
3. Invalid file shows a helpful error.
4. Merge/replace options are clear.
5. Full replace requires confirmation.
6. Notes and attachments are included or attachment limitations are clearly explained.

## 8.11 Security tests

- Markdown scripts are not executed.
- Unsafe HTML is sanitized.
- Imported JSON is validated.
- External links use safe attributes.
- File attachments have size/type validation.
- No contest credentials are requested or stored.
- No live contest automation exists.

## 8.12 Definition of done

A phase is complete only when:
- UI is implemented.
- Data persistence is wired.
- Validation and error states exist.
- Acceptance tests for that phase pass.
- README is updated.
- No dead controls remain.
