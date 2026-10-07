# Patchwright Agent Dashboard (one folder per page)

Open `index.html` in a browser. No install or build step.

Every sidebar item has its own folder under `pages/`, named after it. Edit the page there.

| Sidebar item     | Folder                    | Files |
|------------------|---------------------------|-------|
| Dashboard        | pages/dashboard/          | dashboard.js, dashboard.css |
| Kanban Board     | pages/kanban-board/       | kanban-board.js, kanban-board.css |
| Sessions         | pages/sessions/           | sessions.js, sessions.css, sessions-data.js (sample sessions) |
| Change Analyzer  | pages/change-analyzer/    | change-analyzer.js (layout), change-analyzer-engine.js (checks and report), change-analyzer.css |
| Activity Feed    | pages/activity-feed/      | activity-feed.js, activity-feed.css |
| Analytics        | pages/analytics/          | analytics.js, analytics.css |
| Code Quality     | pages/code-quality/       | code-quality.js, code-quality.css |
| Reviews          | pages/reviews/            | reviews.js, reviews.css |
| Workflows        | pages/workflows/          | workflows.js, workflows.css |
| Settings         | pages/settings/           | settings.js, settings.css |

Shared files (used by every page) are in `shared/`:

- `shared/css/` theme colours, layout, shared components, responsive rules
- `shared/js/core.js` helpers · `i18n.js` sidebar names and languages · `state.js` app state ·
  `ui.js` charts, KPI cards, tabs · `app.js` sidebar, drawing and click handling

## Common edits

- Rename a sidebar item: `shared/js/i18n.js` (the `L` object, one line per language).
- Change sample numbers or text on a page: open that page's `.js` file.
- Change sample sessions and diffs: `pages/sessions/sessions-data.js`.
- Change colours: `shared/css/theme.css`.
- Add a page: copy a page folder, register it in the `V` object in `shared/js/app.js`,
  add its name and icon in `shared/js/i18n.js`, and add its `<script>` and `<link>` to `index.html`.

Keep the `<script>` order in `index.html` (shared files, then pages, then `app.js`).
All numbers are sample data. The Change Analyzer uses text matching, not a full Python parser.
