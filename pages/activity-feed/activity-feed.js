/* PAGE: Activity Feed (sidebar item "Activity Feed")
   Real-time chronological stream of agent events, tool calls,
   guard rejections, and test executions.
   Inspired by Claude Code Agent Monitor. */

function act() {
  const currentFilter = tab("af", "All");
  const searchQuery = (st.actSearch || "").toLowerCase();

  const rawEvents = [
    { icon: "✓", type: "gate", text: "Session #32 passed every verification gate", detail: "AST syntax, import resolution and pytest verified", time: "2h ago" },
    { icon: "✕", type: "guard", text: "Guard rejected a call to utils.paginate_query (does not exist)", detail: "Prevented hallucinated API call from staging", time: "yesterday" },
    { icon: "✓", type: "session", text: "Session #31 ready for human review", detail: "Diff generated with +48 / −6 lines across api/users.py", time: "yesterday" },
    { icon: "!", type: "error", text: "Session #30 blocked after 3 repair attempts", detail: "Unresolved import dateutil.parse_strict", time: "2 days ago" },
    { icon: "↻", type: "test", text: "Baseline test run recorded for acme/etl", detail: "58 tests passed on Python 3.14 runner", time: "2 days ago" },
    { icon: "⚑", type: "ast", text: "Symbol index rebuilt: 1,486 functions", detail: "Refreshed AST call graphs in 0.38s", time: "3 days ago" },
    { icon: "⚡", type: "tool", text: "Subagent Patcher executed git_diff on billing/pricing.py", detail: "Generated 15 line minimal patch", time: "3 days ago" },
    { icon: "🔍", type: "tool", text: "Subagent Locator scanned symbol index for acme/shop", detail: "Discovered 4 call sites", time: "3 days ago" },
  ];

  const filtered = rawEvents.filter((e) => {
    if (currentFilter === "Gates" && e.type !== "gate") return false;
    if (currentFilter === "Guards & Alerts" && e.type !== "guard" && e.type !== "error") return false;
    if (currentFilter === "Tools" && e.type !== "tool") return false;
    if (searchQuery && !e.text.toLowerCase().includes(searchQuery) && !e.detail.toLowerCase().includes(searchQuery)) return false;
    return true;
  });

  return (
    head(
      "Activity Feed",
      "Real-time event stream of agent actions, tool calls, and guard decisions.",
    ) +
    `
<div class="box" style="margin-bottom:12px">
  <div class="row" style="gap:10px;align-items:center">
    ${tabs("af", ["All", "Gates", "Guards & Alerts", "Tools"])}
    <input type="text" id="act-search" placeholder="Search event stream..." value="${esc(st.actSearch || "")}" style="flex:1;max-width:280px;padding:5px 10px;border-radius:6px;border:1px solid var(--line);background:var(--bg)">
    <span class="badge b-ok r"><span class="dot"></span>Live SSE Stream</span>
  </div>
</div>

<div class="box">
  <div class="activity-stream">
    ${
      filtered.length
        ? filtered
            .map(
              (e) => `
      <div class="activity-item">
        <span class="activity-icon ${e.icon === "✓" ? "up" : e.icon === "✕" || e.icon === "!" ? "dn" : "mut"}">${e.icon}</span>
        <div class="activity-body">
          <div class="row" style="justify-content:space-between">
            <b>${esc(e.text)}</b>
            <span class="mut">${e.time}</span>
          </div>
          <small class="mut">${esc(e.detail)}</small>
        </div>
      </div>
    `,
            )
            .join("")
        : '<p class="mut" style="text-align:center;padding:20px">No matching events found</p>'
    }
  </div>
</div>
`
  );
}
