/* PAGE: Dashboard (sidebar item "Dashboard")
   Delegate tasks to agent, monitor live health, inspect token/cost KPIs,
   active orchestration status, and recent sessions.
   Inspired by Claude Code Agent Monitor. */

function dash() {
  const h = [
    ["working", S.filter((s) => s.s === "run").length || 2, "var(--acc)"],
    ["idle", 1, "var(--muted)"],
    ["completed", S.filter((s) => s.s === "ok").length || 18, "var(--ok)"],
    ["error", S.filter((s) => s.s === "bad").length || 1, "var(--bad)"],
  ];

  const totalCost = S.reduce((acc, x) => acc + (x.cost || 0), 4450).toFixed(0);
  const activeCount = S.filter((s) => s.s === "run").length;

  return (
    head(
      "Dashboard",
      "Delegate a coding task to the agent, then review the diff and the evidence in real time.",
    ) +
    `
<!-- Live Agent Launcher Box -->
<div class="box task" style="margin-bottom:14px">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <b>Delegate Task to Coding Agent</b>
    <span class="badge ${API.isOnline ? "b-ok" : "b-warn"}">${API.isOnline ? "● SQLite & SSE Live" : "○ Sandbox Mode"}</span>
  </div>
  <textarea id="ti" aria-label="Describe a coding task" placeholder="Describe a bug to fix, a refactoring, or a new feature (e.g. 'Fix negative balance check in checkout', 'Add pagination to /api/users')..."></textarea>
  <div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap;align-items:center">
    <div style="display:flex;align-items:center;gap:6px">
      <small class="mut">Repo:</small>
      <select id="run-repo" style="padding:4px 8px;border-radius:6px;border:1px solid var(--line);background:var(--bg)">
        <option value="acme/shop">acme/shop (main)</option>
        <option value="acme/api">acme/api (main)</option>
        <option value="acme/etl">acme/etl (main)</option>
        <option value="patchwright">patchwright (local)</option>
      </select>
    </div>
    <div style="display:flex;align-items:center;gap:6px">
      <small class="mut">Model:</small>
      <select id="run-model" style="padding:4px 8px;border-radius:6px;border:1px solid var(--line);background:var(--bg)">
        <option value="Claude 3.7 Sonnet">Claude 3.7 Sonnet (Hybrid)</option>
        <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
        <option value="Claude 3 Opus">Claude 3 Opus</option>
        <option value="Claude 3.5 Haiku">Claude 3.5 Haiku</option>
        <option value="GPT-4o">GPT-4o</option>
      </select>
    </div>
    <div style="display:flex;align-items:center;gap:6px">
      <small class="mut">File:</small>
      <input type="text" id="run-file" value="billing/pricing.py" style="width:140px;padding:4px 8px;border-radius:6px;border:1px solid var(--line);background:var(--bg)">
    </div>
    <button class="btn pri r" data-a="run">⚡ Run Agent</button>
  </div>
</div>

<!-- Headline Metrics -->
<div class="g4">
  ${kpi("TOTAL SESSIONS", `${S.length}`, activeCount > 0 ? `<span class="up">${activeCount} actively running</span>` : "Ready for tasks")}
  ${kpi("ACTIVE AGENTS", `${activeCount * 3 + 4}`, "Subagent orchestration")}
  ${kpi("CACHE HIT RATE", "95.4%", "Token context caching")}
  ${kpi("TOTAL SPEND", `$${totalCost}`, "Across all models")}
</div>

<!-- Health and Outcomes -->
<div class="g21">
  <div class="box">
    <h2>Activity Heatmap, Last 52 Weeks</h2>
    ${heat()}
  </div>
  <div class="box">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <h2>Agent System Health</h2>
      <button class="btn sm" data-v="health">Details →</button>
    </div>
    <div class="hb">
      ${h.map((x) => `<i style="flex:${x[1]};background:${x[2]}"></i>`).join("")}
    </div>
    <div class="legend" style="flex-direction:column;gap:4px">
      ${h.map((x) => `<span><i style="background:${x[2]}"></i>${x[0]} · ${x[1]}</span>`).join("")}
    </div>
    <div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--line);display:flex;justify-content:space-between">
      <span class="mut">Composite score:</span>
      <strong class="up">98 / 100 (Optimal)</strong>
    </div>
  </div>
</div>

<div class="g21">
  <div class="box">
    <h2>Tasks Resolved, Last 30 Days</h2>
    ${bars(rn(30, 4, 20))}
  </div>
  <div class="box">
    <h2>Outcomes & Guard Verifications</h2>
    <div class="row">
      ${donut(
        [
          ["a", 78, "var(--ok)"],
          ["b", 14, "var(--acc)"],
          ["c", 8, "var(--bad)"],
        ],
        "92%",
      )}
      ${leg([
        ["Resolved first try", 78, "var(--ok)"],
        ["Fixed after guard rejection", 14, "var(--acc)"],
        ["Stopped and reported", 8, "var(--bad)"],
      ])}
    </div>
  </div>
</div>

<div class="g3">
  ${kpi("PATCH SUGGESTIONS", "74,418", "Last 28 days")}
  ${kpi("PATCHES ACCEPTED", "9,409", '<div class="bar"><i style="width:13%"></i></div>13% acceptance rate')}
  ${kpi("AGENT CONTRIBUTION", "99%", "Of code changes were agent-initiated")}
</div>

<div class="g2">
  <div class="box">
    <h2>Lines of Code Changed</h2>
    <div class="kpi">
      <strong>1.8m</strong>
      <em>added and deleted, last 28 days · avg 8.5k deleted per day</em>
    </div>
  </div>
  <div class="box">
    <h2>Lines Added vs Deleted Trend</h2>
    ${line(rn(28, 3, 20))}
  </div>
</div>

<div class="box">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <h2>Recent Agent Sessions</h2>
    <button class="btn sm" data-v="ses">All Sessions →</button>
  </div>
  ${filt()}
  ${sessRows(fl().slice(0, 5))}
</div>
`
  );
}
