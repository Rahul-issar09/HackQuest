# HackQuest Prep — Claude Code Build Package

This package is the source of truth for building **HackQuest Prep**, a private, single-user, MongoDB-backed web application for preparing for TCS HackQuest Season 11 Round 1.

## Read these documents in order

1. `01_PRODUCT_REQUIREMENTS.md` — product scope and user journeys.
2. `02_TCS_RULES_AND_CONTENT_BOUNDARIES.md` — what the uploaded TCS rules actually say and what must not be presented as guaranteed.
3. `03_LEARNING_ROADMAP.md` — 31-day preparation schedule, learning objectives and resources.
4. `04_FEATURE_SPECIFICATIONS.md` — detailed behaviour for every page/module.
5. `05_TECHNICAL_ARCHITECTURE.md` — stack, application structure, persistence and offline strategy.
6. `06_DATA_MODEL.md` — entities, fields, relationships and derived metrics.
7. `07_UI_UX_DESIGN_SYSTEM.md` — visual direction, navigation and interaction standards.
8. `08_ACCEPTANCE_CRITERIA_AND_TEST_PLAN.md` — definition of done and test cases.
9. `09_CLAUDE_CODE_MASTER_PROMPT.md` — copy/paste build prompt.

## Important project decisions

- Product name: HackQuest Prep.
- Audience: one private user initially.
- Primary target: Intermediate-level preparation, while retaining Beginner and Expert practice.
- Target exam date configured by default: 5 December 2026. The roadmap runs from 4 November through 4 December 2026. Make dates editable in Settings.
- No authentication in v1.
- MongoDB-backed persistence; do not require cloud services.
- All progress and analytics must be derived from actual user activity.
- The app is a preparation tracker and mock simulator. It must not automate or interact with the live HackQuest competition platform.
- The uploaded TCS rules are the authority for contest-specific claims. The schedule and topic allocations are preparation recommendations, not official TCS syllabus or guaranteed exam content.

## How to use

Place this package in the project root (or copy the `docs` folder into an existing repository). Open Claude Code in the repository and paste the master prompt from `09_CLAUDE_CODE_MASTER_PROMPT.md`.

Claude Code should inspect the repository first, then implement the app in small, testable phases. It must use these documents as the requirements source and report any ambiguity instead of silently inventing official contest facts.
