/* PAGE: Workflows (sidebar item "Workflows")
   Pipeline funnel, subagent stage rules, and workflow runners.
   Inspired by Claude Code Agent Monitor. */

function wf() {
  const F = [
    ["1. Index Symbols", 100],
    ["2. Locate Context", 98],
    ["3. Generate Patch", 96],
    ["4. AST & Import Guard", 91],
    ["5. Pytest Verification", 84],
    ["6. Delivered for Review", 78],
  ];

  return (
    head("Workflows", "Subagent delivery pipeline, stage rules, and automated workflow triggers.") +
    `
<div class="g21">
  <div class="box">
    <h2>Agent Pipeline Funnel</h2>
    ${hb(F.map(([n, v]) => [n, v, v + "% of tasks successfully advance"]))}
  </div>

  <div class="box">
    <h2>Stage Enforcement Rules</h2>
    <div class="li"><span>Edit before AST Guard</span><b class="dn">Strictly prohibited</b></div>
    <div class="li"><span>Report before Verify</span><b class="dn">Strictly prohibited</b></div>
    <div class="li"><span>Max repair retries</span><b>${st.cfg.tries || 3} attempts</b></div>
    <div class="li"><span>Diff size threshold</span><b>${st.cfg.diff || 60} lines</b></div>
    <div class="li"><span>Hallucinated symbol guard</span><b class="up">Strict fail</b></div>
  </div>
</div>

<div class="box" style="margin-top:12px">
  <h2>Automated Pipeline Triggers</h2>
  <div class="g3" style="margin-top:10px">
    <div class="box" style="background:var(--bg)">
      <b>Re-index Symbol Graph</b>
      <p class="mut" style="font-size:12px;margin:6px 0 10px">Walks repository AST, rebuilds caller cross-references and symbol database.</p>
      <button class="btn" style="width:100%" data-a="wf-index">Trigger Re-index</button>
    </div>
    <div class="box" style="background:var(--bg)">
      <b>Run Verification Suite</b>
      <p class="mut" style="font-size:12px;margin:6px 0 10px">Executes full unit test runner across all staged patches and active sessions.</p>
      <button class="btn" style="width:100%" data-a="wf-verify">Trigger Verifier</button>
    </div>
    <div class="box" style="background:var(--bg)">
      <b>Security Sentinel Sweep</b>
      <p class="mut" style="font-size:12px;margin:6px 0 10px">Scans code changes for SQL injection risks, shell commands, and secret leaks.</p>
      <button class="btn" style="width:100%" data-a="wf-security">Trigger Security Audit</button>
    </div>
  </div>
</div>
`
  );
}
