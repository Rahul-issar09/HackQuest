# 7. UI/UX Design System

## 7.1 Visual direction

Create a polished, professional dark cybersecurity workspace. It should feel like a modern developer productivity dashboard, not a stereotypical hacker movie screen.

- Base: deep navy/charcoal backgrounds.
- Surfaces: slightly lighter cards and panels.
- Accent: restrained electric blue.
- Success: green.
- Warning: amber.
- Danger: red.
- Text: high-contrast neutral shades.
- Use colour sparingly and never rely on colour alone.

Avoid excessive glow, neon, animated backgrounds, matrix rain, excessive gradients and clutter.

## 7.2 Layout

Desktop:
- Fixed/collapsible left sidebar.
- Top bar with page title, search, countdown and quick actions.
- Main content with responsive max width.
- Dashboard cards and charts.

Mobile:
- Sidebar becomes drawer/bottom navigation as appropriate.
- Cards stack vertically.
- Tables become horizontally scrollable or card lists.
- Editor remains usable at narrow widths.

## 7.3 Navigation

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

## 7.4 Component standards

- Consistent card radius and spacing.
- Clear page titles and subtitles.
- Use badges for status/difficulty only.
- Provide empty states with a useful action.
- Confirm destructive actions.
- Provide toast feedback for save/update/delete.
- Show loading and error states.
- Use accessible form labels and keyboard navigation.
- Keep primary actions visually distinct.

## 7.5 Dashboard composition

Suggested order:
1. Header with competition countdown and target difficulty.
2. Today's mission card.
3. Progress summary.
4. Quick stats: solved challenges, study time, mock sessions.
5. Weekly roadmap strip.
6. Category performance chart.
7. Weakness recommendations.
8. Recent notes and recent attempts.

## 7.6 Notes experience

Use a three-pane desktop layout where practical:
- Left: folders and tags.
- Middle: searchable note list.
- Right: editor and preview.

On mobile, use separate list and editor screens.

Editor features:
- Markdown toolbar.
- Headings, lists, checklists, links, tables, inline code and fenced code.
- Preview toggle.
- Autosave state.
- Last saved time.
- Attachments panel.
- Link-to-challenge/day controls.

## 7.7 Mock arena experience

- Large visible timer.
- Challenge navigation list.
- Category/difficulty labels.
- Status controls.
- Session progress.
- Clear finish session action.
- No fake official TCS interface or branding that implies affiliation.

## 7.8 Branding

Use product name "HackQuest Prep". Add a small disclaimer in About/Settings:
"Independent personal preparation tool. Not affiliated with or endorsed by Tata Consultancy Services."
