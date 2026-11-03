# 4. Feature Specifications

## 4.1 Dashboard

Display:
- Dynamic countdown to configured exam date.
- Overall completion percentage based on completed required tasks.
- Today's learning plan and checklist.
- Current roadmap day.
- Total challenges attempted and solved.
- Category-wise performance summary.
- Upcoming mock session.
- Recent notes and recently failed challenges.
- Study time this week.
- Quick actions: add note, log challenge, start study session.

Rules:
- Every metric must be computed from persisted data.
- If no attempts exist, show an empty state rather than 0% mastery.
- Countdown must use local date and configured exam date.
- Do not show fabricated scores or progress.

## 4.2 Roadmap

Views:
- Day list/timeline.
- Calendar.
- Day detail.

Day detail:
- Objectives.
- Topics.
- TCS relevance classification.
- Resources.
- Practical tasks.
- CTF target.
- Time estimate.
- Checklist.
- Notes linked to day.
- Completion state.

Allow rescheduling without losing original day metadata. Provide a "restore default roadmap" action with confirmation.

## 4.3 Resource Library

Resource fields:
- Title, description, URL.
- Category and tags.
- Difficulty.
- Resource type (course, lab, documentation, article, video, tool).
- Free/paid/unknown status.
- Linked roadmap days.
- Favourite flag.
- Completion status.
- Personal notes.

Features:
- Search title and description.
- Filter by category, type, difficulty and status.
- Add/edit/delete custom resource.
- Open external links in new tab with safe rel attributes.

## 4.4 CTF Challenge Tracker

Challenge fields:
- Name, platform, URL.
- Category.
- Difficulty.
- Description.
- Tags.
- Suggested roadmap day.
- Source classification.
- Active/archived.

Attempt fields:
- Challenge ID.
- Attempt date/time.
- Status: not started, attempted, solved, skipped.
- Time taken.
- Number of attempts.
- Hints used.
- Self-assessed difficulty.
- Outcome and lessons learned.
- Private flag field is optional; never display or log actual contest credentials.
- Linked notes.
- Evidence attachment references.

Allow multiple attempts for one challenge. Analytics should use attempt records, not only the latest challenge status. Make the metric definition explicit.

Retry queue:
- Include unsolved or failed attempts.
- Let user set retry date and priority.
- Remove from queue when user marks a later attempt solved, while retaining history.

## 4.5 Mock CTF Arena

Mock setup:
- Title.
- Duration (default 6 hours).
- Start date/time.
- Selected challenge set.
- Category and difficulty mix.
- Optional points configured by user.
- Notes/report reminder.

During mock:
- Countdown timer.
- Challenge list and status.
- Start/pause/resume where appropriate.
- Record attempt and completion time.
- Score only from user-configured points or explicitly entered result.
- Do not invent official TCS scoring.

After mock:
- Total attempted/solved.
- Score if configured.
- Time per challenge.
- Category breakdown.
- Self-review.
- Lessons learned.
- Link to report records.

Seed suggested mock dates: Nov 16, Nov 26, Dec 2, 2026. These are personal preparation dates, not official contest dates.

Timer implementation:
- Persist start time and duration.
- On reload, recalculate remaining time from timestamps.
- Avoid relying solely on an in-memory interval.
- Warn before leaving an active mock.
- Provide clear finish and discard actions.

## 4.6 Performance Analytics

Show:
- Attempt count.
- Solved count.
- First-attempt solve rate.
- Overall solve rate.
- Median/average solve time (state which).
- Category-wise solve rate.
- Difficulty-wise solve rate.
- Mock trend.
- Study time trend.

Use clear empty states. Do not equate number of tasks completed with actual skill mastery.

## 4.7 Weakness Analysis

Use transparent rules, not opaque AI:
- Low solve rate in a category -> recommend more practice.
- Repeated failed attempts -> add to revision queue.
- High solve time -> recommend timed drills.
- No activity in a domain -> label "not assessed", not "weak".
- Strong category requires a minimum sample size, configurable (default 5 attempts).

Show why each recommendation appears and which attempts support it.

## 4.8 My Notes & Knowledge Base

This is a first-class feature.

Core:
- Create, edit, delete notes.
- Autosave with visible saved/saving/error state.
- Markdown editor and preview.
- Code blocks with syntax highlighting.
- Folders and nested folders.
- Tags.
- Search note titles and content.
- Pin and favourite.
- Attach notes to roadmap days, resources, challenges and mock sessions.
- Sort by updated date, created date and title.
- Export one note or all notes as Markdown.
- Export printable/PDF version if reliable.
- Attach images/files where feasible; enforce reasonable file-size limits.
- Confirm deletion.
- Recover from failed save where possible.

Default folders:
Linux, Web Security, Cryptography, Networking, Digital Forensics, Reverse Engineering, SOC, Python Scripts, CTF Writeups, Cheat Sheets, General Notes.

Editor requirements:
- Autosave after a short debounce.
- Save immediately on explicit save action.
- Warn if navigating away while a save is pending or failed.
- Store note body as Markdown.
- Sanitize rendered HTML; do not execute embedded scripts.
- Support fenced code blocks and inline code.
- Provide a quick "New note" action from Dashboard and challenge/day pages.

## 4.9 Report Builder

Practice report fields:
- Challenge name/category/difficulty.
- Objective/problem statement.
- Initial observations.
- Tools and commands.
- Step-by-step methodology.
- Finding/weakness.
- Flag retrieval explanation.
- Evidence screenshots with timestamps.
- Conclusion.
- Linked challenge and attempt.

Exports:
- Markdown.
- PDF if implementation is robust.

Display a notice: during the actual contest, use the current official TCS-provided report template, size limit and submission instructions. This app's template is for preparation and must not be assumed to replace TCS's template.

## 4.10 Readiness Score

Personal metric with default weights:
- Learning completion: 15%.
- CTF performance: 35%.
- Domain coverage: 15%.
- Mock performance: 25%.
- Reporting: 10%.

Requirements:
- Show formula and component breakdown.
- Exclude categories with no data from mastery claims.
- Avoid showing 100% readiness as a guarantee of qualification.
- Allow weights to be configured only if recalculation remains transparent.
- Label it "Personal preparation readiness", never "TCS qualification probability".

## 4.11 Settings and backup

- Edit preparation start date and exam date.
- Edit daily study target.
- Toggle theme if supported.
- Manage roadmap/resources/challenges.
- Export complete JSON backup.
- Import and validate backup.
- Export notes separately.
- Reset seeded content.
- Full reset with strong confirmation.

## 4.12 Accessibility and responsive design

- Keyboard accessible controls.
- Visible focus indicators.
- Semantic headings and labels.
- Sufficient colour contrast.
- Do not use colour alone for status.
- Mobile navigation drawer.
- Tables become scrollable or card-based on narrow screens.
- Touch targets appropriately sized.
