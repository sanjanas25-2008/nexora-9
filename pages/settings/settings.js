/* PAGE: Settings (sidebar item "Settings")
   Safeguards, agent model parameters, real-time telemetry settings,
   and theme options saved persistently to SQLite.
   Inspired by Claude Code Agent Monitor. */

function set() {
  const c = st.cfg;
  const sw = (k, l) =>
    `<div class="sw"><label for="c_${k}">${l}</label><input type="checkbox" id="c_${k}" data-c="${k}"${c[k] ? " checked" : ""}></div>`;

  return (
    head("Settings", "Agent parameters, verification safeguards, and real-time telemetry settings.") +
    `
<div class="g2">
  <div class="box">
    <h2>Safeguards & Quality Thresholds</h2>
    ${sw("ast", "Symbol check (AST index & hallucination guard)")}
    ${sw("imp", "Import resolution verification")}
    ${sw("test", "Run full pytest suite on patch")}
    ${sw("lint", "Syntax and static linter pass")}
    <div class="sw">
      <label for="c_tries">Max repair attempts before human intervention</label>
      <input type="number" id="c_tries" data-c="tries" min="1" max="10" value="${c.tries || 3}" style="width:70px">
    </div>
    <div class="sw">
      <label for="c_diff">Diff size threshold limit (lines)</label>
      <input type="number" id="c_diff" data-c="diff" min="5" max="500" value="${c.diff || 60}" style="width:80px">
    </div>
  </div>

  <div class="box">
    <h2>Agent Orchestration Configuration</h2>
    <div class="sw">
      <label for="c_model">Default Agent Model</label>
      <select id="c_model" data-c="model" style="padding:4px 8px;border-radius:6px;border:1px solid var(--line);background:var(--bg)">
        <option value="Claude 3.7 Sonnet"${c.model === "Claude 3.7 Sonnet" ? " selected" : ""}>Claude 3.7 Sonnet (Recommended)</option>
        <option value="Claude 3.5 Sonnet"${c.model === "Claude 3.5 Sonnet" ? " selected" : ""}>Claude 3.5 Sonnet</option>
        <option value="Claude 3 Opus"${c.model === "Claude 3 Opus" ? " selected" : ""}>Claude 3 Opus</option>
        <option value="Claude 3.5 Haiku"${c.model === "Claude 3.5 Haiku" ? " selected" : ""}>Claude 3.5 Haiku</option>
        <option value="GPT-4o"${c.model === "GPT-4o" ? " selected" : ""}>GPT-4o</option>
      </select>
    </div>
    <div class="sw">
      <label for="c_thinking">Thinking Effort</label>
      <select id="c_thinking" data-c="thinking" style="padding:4px 8px;border-radius:6px;border:1px solid var(--line);background:var(--bg)">
        <option value="low"${c.thinking === "low" ? " selected" : ""}>Low (Fastest)</option>
        <option value="medium"${c.thinking === "medium" || !c.thinking ? " selected" : ""}>Medium (Balanced)</option>
        <option value="high"${c.thinking === "high" ? " selected" : ""}>High (Thorough AST reasoning)</option>
      </select>
    </div>
    <div class="sw">
      <label for="c_perm">Permission Mode</label>
      <select id="c_perm" data-c="permission_mode" style="padding:4px 8px;border-radius:6px;border:1px solid var(--line);background:var(--bg)">
        <option value="prompt"${c.permission_mode === "prompt" || !c.permission_mode ? " selected" : ""}>Prompt for confirmation</option>
        <option value="sandbox"${c.permission_mode === "sandbox" ? " selected" : ""}>Read/Write Isolation Sandbox</option>
        <option value="bypass"${c.permission_mode === "bypass" ? " selected" : ""}>Bypass (Automated runs)</option>
      </select>
    </div>
    ${sw("sse", "Server-Sent Events (SSE) Live Telemetry")}
  </div>
</div>

<div class="g2" style="margin-top:12px">
  <div class="box">
    <h2>Display & Theme</h2>
    <div class="sw">
      <span>Theme mode</span>
      <div class="seg" style="width:220px">
        <button data-th="auto">System</button>
        <button data-th="dark">Dark</button>
        <button data-th="light">Light</button>
      </div>
    </div>
    <p class="note" style="margin-top:8px">Language localization (English, 中文, Tiếng Việt) can be toggled from the sidebar.</p>
  </div>

  <div class="box">
    <h2>Save & Synchronize</h2>
    <p class="mut" style="font-size:13px;margin:4px 0 12px">
      Synchronizes settings directly with SQLite persistent backend.
    </p>
    <button class="btn pri" data-a="save-settings" style="width:100%">
      💾 Save Settings to Database
    </button>
  </div>
</div>
`
  );
}
