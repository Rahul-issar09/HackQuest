# 1. Product Requirements Document (PRD)

## 1.1 Product overview

**Name:** HackQuest Prep  
**Type:** Private, single-user cybersecurity learning and CTF preparation tracker  
**Primary purpose:** Help the user prepare systematically for TCS HackQuest Season 11 Round 1, targeting Intermediate challenges while building enough breadth to attempt Beginner and selected Expert challenges.

HackQuest Prep is not a CTF platform and does not host vulnerable targets. It organizes learning, links to external authorised practice resources, records challenge attempts, runs local mock sessions, manages notes and reports, and analyses the user's preparation.

## 1.2 Product goals

1. Make it immediately clear what the user should learn and practise today.
2. Provide a complete editable 31-day preparation roadmap.
3. Centralise learning resources and external links.
4. Track practical CTF attempts, outcomes and time spent.
5. Simulate six-hour mock competitions without connecting to the live contest.
6. Maintain a searchable personal cybersecurity notes library.
7. Help identify weak domains using recorded performance.
8. Provide a practice report builder aligned with the reporting concepts in the TCS rules.
9. Preserve user data locally and allow backup/restore.
10. Work well on desktop and mobile.

## 1.3 Non-goals

- No live HackQuest platform integration, scraping, flag submission or browser automation.
- No automated exploitation or vulnerability scanning of third-party systems.
- No multiplayer, public profiles or leaderboard in v1.
- No AI chatbot in v1.
- No guarantee of qualification or official TCS score prediction.
- No claim that supplementary topics are guaranteed to appear in Round 1.
- No user account or cloud sync in v1.

## 1.4 User profile and defaults

- Single user; no login.
- Primary difficulty target: Intermediate.
- Beginner challenges remain in the plan for confidence and quick wins.
- Expert challenges remain as optional/stretch practice.
- Exam date default: 5 December 2026 (editable).
- Preparation start default: 4 November 2026 (editable).
- Initial target study time: 4 hours/day (editable).
- Dark cybersecurity visual theme.
- MongoDB-backed data persistence.

## 1.5 Primary user journey

1. User opens Dashboard and sees countdown, today's plan and progress.
2. User opens today's roadmap entry.
3. User reads objectives and opens the assigned learning resources.
4. User completes a lab or CTF challenge.
5. User records status, difficulty, time, hints, result and lessons learned.
6. User writes notes and links them to the day or challenge.
7. The dashboard and analytics update from recorded activity.
8. User takes scheduled mock sessions.
9. User reviews weak areas and failed challenges.
10. User exports a backup and reviews readiness before the event.

## 1.6 Success measures

The product is successful when the user can:
- Find today's tasks in two clicks or fewer.
- Mark learning tasks complete and see progress update.
- Add and search notes without losing content on refresh.
- Record multiple attempts for one challenge.
- Run a mock timer and record a mock result.
- See category-level accuracy based on their attempts.
- Export and restore their data.
- Use core features at common desktop and mobile widths.

Readiness is a personal preparation indicator only, not an official TCS assessment.

## 1.7 MVP priorities

**P0 — required for first usable release**
- Dashboard
- Roadmap and daily tasks
- Resource library
- CTF challenge tracker
- My Notes
- Local persistence
- Backup/export and restore
- Responsive navigation

**P1 — required before final preparation**
- Mock CTF Arena
- Performance analytics
- Weakness analysis
- Report builder
- Readiness score

**P2 — optional polish**
- PWA/offline shell
- Study streaks and achievements
- Advanced spaced revision
- Import resource catalogue from JSON

## 1.8 Functional requirements

- Every task, resource, challenge, note, mock and report must have a stable ID.
- User edits must persist across refreshes.
- Destructive actions must ask for confirmation.
- External resource links must open safely in a new tab.
- Forms must validate required fields and provide clear errors.
- Empty states must explain how to add the first item.
- The application must provide useful seeded data on first launch.
- User must be able to reset seeded data without losing their own data unless they explicitly confirm a full reset.
