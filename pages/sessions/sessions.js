/* PAGE: Sessions (sidebar item "Sessions")
   Detailed session inspector:
   - Agents hierarchy & orchestration tree
   - Interactive live conversation with tool execution cards & chat box
   - Chronological event timeline with filtering
   - Tasks progress checklist
   - Patch diff viewer & verification report
   Inspired by Claude Code Agent Monitor. */

function ses() {
  const s = S.find((x) => x.id === st.sid);
  if (!s) {
    const q = (st.sesSearch || "").toLowerCase();
    const filtered = fl().filter(
      (x) => !q || x.title.toLowerCase().includes(q) || x.repo.toLowerCase().includes(q) || x.file.toLowerCase().includes(q),
    );

    return (
      head("Sessions", "All AI coding agent sessions recorded in SQLite.") +
      `<div class="box" style="margin-bottom:12px">
        <div class="row" style="gap:10px;align-items:center">
          ${filt()}
          <input type="text" id="ses-search" placeholder="Search sessions by title, repo, or file..." value="${esc(st.sesSearch || "")}" style="flex:1;max-width:320px;padding:5px 10px;border-radius:6px;border:1px solid var(--line);background:var(--bg)">
          <button class="btn pri r" data-a="open-run-modal">+ New Agent Run</button>
        </div>
      </div>
      <div class="box">${sessRows(filtered)}</div>`
    );
  }

  const run = s.s === "run";
  const t = tab("sd", "Conversation");
  const nl = (a) => a.map((l, i) => `<span data-n="${i + 1}">${esc(l)}</span>`).join("");

  let body = "";

  if (t.startsWith("Agents")) {
    body = `
<div class="g21">
  <div class="box">
    <h2>Subagent Orchestration Tree</h2>
    <div class="agent-tree">
      <div class="agent-node root">
        <div class="agent-header">
          <span class="agent-avatar">👑</span>
          <div>
            <b>Main Orchestrator</b>
            <small class="mut">Coordinates workflow, manages subagent delegation</small>
          </div>
          <span class="badge ${run ? "b-run" : "b-ok"}">${run ? "Working" : "Completed"}</span>
        </div>
        <div class="agent-meta">
          <span>Model: ${esc(s.model)}</span>
          <span>Tokens: ${s.tokens || "18.4k"}</span>
          <span>Cost: $${s.cost.toFixed(2)}</span>
        </div>
      </div>

      <div class="agent-children">
        <div class="agent-node child">
          <div class="agent-header">
            <span class="agent-avatar">🔍</span>
            <div>
              <b>AST Locator</b>
              <small class="mut">Scans repository symbol index & AST call graphs</small>
            </div>
            <span class="badge b-ok">Completed</span>
          </div>
          <div class="agent-meta">
            <span>Tools used: 6 (grep_search, find_symbol)</span>
            <span>Duration: 1.4s</span>
          </div>
        </div>

        <div class="agent-node child">
          <div class="agent-header">
            <span class="agent-avatar">⚡</span>
            <div>
              <b>Code Patcher</b>
              <small class="mut">Generates minimal AST-compliant diff</small>
            </div>
            <span class="badge ${run ? "b-run" : "b-ok"}">${run ? "Generating Diff" : "Completed"}</span>
          </div>
          <div class="agent-meta">
            <span>Lines modified: +${s.add} / −${s.del}</span>
            <span>Target: ${esc(s.file)}</span>
          </div>
        </div>

        <div class="agent-node child">
          <div class="agent-header">
            <span class="agent-avatar">🛡️</span>
            <div>
              <b>Gate Verifier</b>
              <small class="mut">Executes unit tests & AST security guards</small>
            </div>
            <span class="badge ${run ? "b-warn" : s.s === "ok" ? "b-ok" : "b-bad"}">${run ? "Pending" : s.s === "ok" ? "5/5 Passed" : "Rejection"}</span>
          </div>
          <div class="agent-meta">
            <span>Regression checks: 95 passing</span>
            <span>Imports resolved: 100%</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="box">
    <h2>Subagent Telemetry</h2>
    <div class="li"><span class="mut">Total Subagents</span><b>4</b></div>
    <div class="li"><span class="mut">Tool Calls Executed</span><b>${s.log.length * 4}</b></div>
    <div class="li"><span class="mut">Context Token Cache</span><b class="up">96.2% Hit</b></div>
    <div class="li"><span class="mut">Orchestration Latency</span><b>${(s.cost * 18).toFixed(1)}s</b></div>
    <div class="li"><span class="mut">Sandbox Isolation</span><b class="up">Active (Read/Write sandbox)</b></div>
  </div>
</div>`;
  } else if (t === "Conversation") {
    body = `
<div class="g21">
  <div class="box transcript-box">
    <h2>Live Conversation & Tool Execution Log <span class="mut">(${s.log.length * 2 + 1} turns)</span></h2>
    <div class="chat-thread" id="chat-thread">
      <div class="chat-msg user">
        <div class="chat-sender"><strong>User</strong> <span>Initial prompt</span></div>
        <div class="chat-bubble">${esc(s.title)}</div>
      </div>

      <div class="tool-call-card">
        <div class="tool-head">
          <span class="tool-badge">TOOL CALL</span>
          <code>ast_symbol_indexer.lookup("${esc(s.file)}")</code>
          <span class="mut r">0.24s</span>
        </div>
        <div class="tool-body">
          <span class="mut">Result: Found target symbol and 3 callers across project.</span>
        </div>
      </div>

      ${s.log
        .map(
          (l, i) => `
        <div class="chat-msg agent">
          <div class="chat-sender"><strong>Agent (${esc(s.model)})</strong> <span>Step ${i + 1}</span></div>
          <div class="chat-bubble">${esc(l)}</div>
        </div>
        ${
          i === 1
            ? `
        <div class="tool-call-card">
          <div class="tool-head">
            <span class="tool-badge">TOOL CALL</span>
            <code>patch_generator.apply_diff("${esc(s.file)}")</code>
            <span class="mut r">0.68s</span>
          </div>
          <div class="tool-body">
            <span class="up">✓ Patch staged (+${s.add} / −${s.del} lines)</span>
          </div>
        </div>`
            : ""
        }
      `,
        )
        .join("")}

      ${run ? '<div class="chat-msg agent"><div class="chat-bubble working-pulse">Agent is generating response and running verification gates…</div></div>' : ""}
    </div>

    <!-- Interactive User Message Box -->
    <div class="chat-input-row" style="margin-top:14px">
      <input type="text" id="interactive-msg" placeholder="Send follow-up instruction to agent (e.g., 'Add another test case', 'Refactor')..." style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg)">
      <button class="btn pri" data-a="send-ses-msg" data-sid="${s.id}">Send Reply</button>
    </div>
  </div>

  <div class="box">
    <h2>Verification Gates</h2>
    ${
      run
        ? '<p class="mut">Gates will execute automatically after code generation completes.</p>'
        : s.gates
            .map(
              ([n, v]) => `
      <div class="gate">
        <span>${esc(n)}</span>
        <span class="${v === 1 ? "up" : v === 0 ? "dn" : "mut"}">${v === 1 ? "✓ pass" : v === 0 ? "✕ fail" : "skipped"}</span>
      </div>
    `,
            )
            .join("")
    }

    <h2 style="margin-top:16px">Test Suite Results</h2>
    ${
      run
        ? '<p class="mut">Running pytest suite…</p>'
        : `<div class="scroll">
        <table>
          <tr><th>Test</th><th>Before</th><th>After</th></tr>
          ${s.tests.map(([n, a, b]) => `<tr><td>${esc(n)}</td><td class="${a === "pass" ? "up" : "dn"}">${a}</td><td class="${b === "pass" ? "up" : b === "fail" ? "dn" : "mut"}">${b}</td></tr>`).join("")}
        </table>
      </div>`
    }
  </div>
</div>

<div class="box" style="margin-top:12px">
  <h2>Patch Diff · ${esc(s.file)}</h2>
  <div class="blk rm">
    <header><span>REMOVED</span><span>${s.rm.length} lines</span></header>
    <pre>${nl(s.rm)}</pre>
  </div>
  <div class="blk ad">
    <header><span>ADDED</span><span>${s.ad.length} lines</span></header>
    <pre>${nl(s.ad)}</pre>
  </div>
</div>`;
  } else if (t === "Timeline") {
    body = `
<div class="box">
  <div class="row" style="justify-content:space-between;margin-bottom:12px">
    <h2>Chronological Event Timeline</h2>
    <div class="seg" style="max-width:320px">
      <button class="active">All (${s.log.length * 2})</button>
      <button>Tool Calls</button>
      <button>Gates</button>
    </div>
  </div>
  <div class="timeline-list">
    ${s.log
      .map(
        (l, i) => `
      <div class="timeline-item">
        <span class="timeline-bullet"></span>
        <div class="timeline-content">
          <div class="row" style="justify-content:space-between">
            <b>${esc(l)}</b>
            <span class="mut">+${(i * 1.8 + 0.3).toFixed(1)}s</span>
          </div>
          <small class="mut">Executed in sandbox environment · AST verified</small>
        </div>
      </div>
    `,
      )
      .join("")}
  </div>
</div>`;
  } else if (t === "Tasks") {
    body = `
<div class="g21">
  <div class="box">
    <h2>Subagent Task Progress</h2>
    <div class="task-checklist">
      <div class="task-item done">
        <span class="task-check">✓</span>
        <div>
          <b>Parse issue requirements & identify target files</b>
          <small class="mut">Owner: Planner · Completed in 0.4s</small>
        </div>
      </div>
      <div class="task-item done">
        <span class="task-check">✓</span>
        <div>
          <b>AST symbol lookup & caller discovery</b>
          <small class="mut">Owner: Locator · Found 3 references</small>
        </div>
      </div>
      <div class="task-item ${run ? "active" : "done"}">
        <span class="task-check">${run ? "…" : "✓"}</span>
        <div>
          <b>Generate patch for ${esc(s.file)}</b>
          <small class="mut">Owner: Patcher · ${run ? "In progress" : "Clean diff"}</small>
        </div>
      </div>
      <div class="task-item ${run ? "pending" : s.s === "ok" ? "done" : "blocked"}">
        <span class="task-check">${run ? "○" : s.s === "ok" ? "✓" : "✕"}</span>
        <div>
          <b>Run verification gates & pytest suite</b>
          <small class="mut">Owner: Verifier · ${run ? "Awaiting patch" : s.s === "ok" ? "Passed 5/5 gates" : "Blocked"}</small>
        </div>
      </div>
    </div>
  </div>

  <div class="box">
    <h2>Task Summary</h2>
    <div class="kpi"><small>COMPLETION</small><strong>${run ? "50%" : s.s === "ok" ? "100%" : "75%"}</strong><em>${run ? "2 of 4 tasks finished" : "Pipeline complete"}</em></div>
    <div class="bar" style="margin-top:10px"><i style="width:${run ? "50%" : s.s === "ok" ? "100%" : "75%"};background:var(--ok)"></i></div>
  </div>
</div>`;
  } else if (t === "Report") {
    body = reportHTML(analyze(s.rm.join("\n"), s.ad.join("\n")), s);
  }

  return (
    `<button class="btn" data-a="back" style="margin-bottom:10px">← Back to all sessions</button>` +
    head(
      esc(s.title) +
        `<span class="badge ${run ? "b-run" : s.s === "ok" ? "b-ok" : "b-bad"}">${run ? "Running Live" : s.s === "ok" ? "Ready for review" : "Blocked"}</span>`,
      `${s.repo}#${s.id} · Model: ${s.model} · Cost: $${s.cost.toFixed(2)} · ${s.tokens || "18k"} tokens · ${s.when}`,
    ) +
    tabs("sd", ["Conversation", "Agents (4)", "Timeline", "Tasks", "Report"]) +
    body
  );
}
