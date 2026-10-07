/* PAGE: Kanban Board (sidebar item "Kanban Board")
   Dual-view Kanban board: Agents View (Working / Waiting / Completed / Error)
   and Sessions View (Active / Waiting / In Review / Completed / Blocked).
   Inspired by Claude Code Agent Monitor. */

function kan() {
  const currentTab = tab("kv", "Agents View");

  const header =
    head("Kanban Board", "Real-time task and agent orchestration board.") +
    tabs("kv", ["Agents View", "Sessions View"]);

  if (currentTab === "Agents View") {
    return header + renderAgentsKanban();
  } else {
    return header + renderSessionsKanban();
  }
}

function renderAgentsKanban() {
  // Synthesize agents across sessions with rich attributes
  const agentList = [];
  S.forEach((s) => {
    if (s.s === "run") {
      agentList.push({
        id: `a-${s.id}-1`,
        name: "Main Orchestrator",
        session: s,
        status: "Working",
        substatus: "Executing tool calls",
        tool: "read_file",
        model: s.model,
        tokens: "18.4k",
        cost: `$${s.cost.toFixed(2)}`,
      });
      agentList.push({
        id: `a-${s.id}-2`,
        name: "AST Locator",
        session: s,
        status: "Working",
        substatus: "Scanning repo symbols",
        tool: "grep_search",
        model: "haiku",
        tokens: "6.2k",
        cost: "$0.04",
      });
    } else if (s.s === "bad") {
      agentList.push({
        id: `a-${s.id}-1`,
        name: "Main Agent",
        session: s,
        status: "Error",
        substatus: "Failed 3 repair attempts",
        tool: "auto_repair",
        model: s.model,
        tokens: "28.1k",
        cost: `$${s.cost.toFixed(2)}`,
      });
      agentList.push({
        id: `a-${s.id}-2`,
        name: "AST Guard",
        session: s,
        status: "Waiting",
        substatus: "Needs human confirmation",
        tool: "permission_prompt",
        model: s.model,
        tokens: "12.0k",
        cost: "$0.10",
      });
    } else {
      agentList.push({
        id: `a-${s.id}-1`,
        name: "Main Coordinator",
        session: s,
        status: "Completed",
        substatus: "Gates verified clean",
        tool: "gate_validator",
        model: s.model,
        tokens: "34.5k",
        cost: `$${s.cost.toFixed(2)}`,
      });
    }
  });

  const columns = [
    {
      title: "Working",
      badge: "b-run",
      desc: "Actively executing tool calls and generating code",
      items: agentList.filter((a) => a.status === "Working"),
    },
    {
      title: "Waiting",
      badge: "b-warn",
      desc: "Waiting for human input, approval, or at fresh prompt",
      items: agentList.filter((a) => a.status === "Waiting"),
    },
    {
      title: "Completed",
      badge: "b-ok",
      desc: "Finished execution, passed gates and verified",
      items: agentList.filter((a) => a.status === "Completed"),
    },
    {
      title: "Error",
      badge: "b-bad",
      desc: "Halted due to guard rejection or verification failure",
      items: agentList.filter((a) => a.status === "Error"),
    },
  ];

  return `
<div class="kanban-grid g4">
  ${columns
    .map(
      (col) => `
    <div class="kanban-col">
      <div class="kanban-col-head">
        <div>
          <h3>${col.title}</h3>
          <small class="mut">${col.desc}</small>
        </div>
        <span class="badge ${col.badge}">${col.items.length}</span>
      </div>
      <div class="kanban-cards">
        ${
          col.items.length
            ? col.items
                .map(
                  (a) => `
          <div class="kanban-card">
            <div class="card-top">
              <span class="chip">${esc(a.name)}</span>
              <span class="model-tag">${esc(a.model)}</span>
            </div>
            <div class="card-title">
              <b>${esc(a.session.title)}</b>
            </div>
            <div class="card-meta">
              <span>Repo: ${esc(a.session.repo)}</span>
              <span>Tool: <code>${esc(a.tool)}</code></span>
            </div>
            <div class="card-footer">
              <span class="mut">${esc(a.substatus)}</span>
              <button class="btn sm" data-sid="${a.session.id}">Inspect →</button>
            </div>
          </div>
        `,
                )
                .join("")
            : '<div class="kanban-empty">No active agents in this stage</div>'
        }
      </div>
    </div>
  `,
    )
    .join("")}
</div>
`;
}

function renderSessionsKanban() {
  const columns = [
    {
      title: "Active Runs",
      badge: "b-run",
      items: S.filter((s) => s.s === "run"),
    },
    {
      title: "Waiting on Input",
      badge: "b-warn",
      items: S.filter((s) => s.s === "waiting" || (s.s === "bad" && s.open)),
    },
    {
      title: "In Review",
      badge: "b-ok",
      items: S.filter((s) => s.s === "ok" && s.open),
    },
    {
      title: "Done / Merged",
      badge: "b-ok",
      items: S.filter((s) => s.s === "ok" && !s.open),
    },
    {
      title: "Blocked",
      badge: "b-bad",
      items: S.filter((s) => s.s === "bad" && !s.open),
    },
  ];

  return `
<div class="kanban-grid g5">
  ${columns
    .map(
      (col) => `
    <div class="kanban-col">
      <div class="kanban-col-head">
        <h3>${col.title}</h3>
        <span class="badge ${col.badge}">${col.items.length}</span>
      </div>
      <div class="kanban-cards">
        ${
          col.items.length
            ? col.items
                .map(
                  (s) => `
          <div class="kanban-card">
            <div class="card-top">
              <span class="chip">${esc(s.repo)}#${s.id}</span>
              <span class="model-tag">${esc(s.model)}</span>
            </div>
            <div class="card-title">
              <b>${esc(s.title)}</b>
            </div>
            <div class="card-meta">
              <span class="up">+${s.add}</span>
              <span class="dn">−${s.del}</span>
              <span class="mut">$${s.cost.toFixed(2)}</span>
            </div>
            <div class="card-footer">
              <span class="mut">${s.when}</span>
              <button class="btn sm" data-sid="${s.id}">View diff →</button>
            </div>
          </div>
        `,
                )
                .join("")
            : '<div class="kanban-empty">No sessions</div>'
        }
      </div>
    </div>
  `,
    )
    .join("")}
</div>
`;
}
