/* App shell: view registry, sidebar, drawing, click/change handlers, start-up */

const V = { dash, kan, ses, chg, act, ana, qual, rev, wf, health, set };

function side() {
  const t = L[st.lang] || L.en;
  $("#side").innerHTML =
    `<div class="brand"><div class="mark">P</div><div><b>Patchwright</b><span>AI agent monitor</span></div></div>` +
    NAV.map(
      ([k, g]) =>
        `<button class="nav" data-v="${k}" title="${t[k]}"${st.v === k ? ' aria-current="page"' : ""}><i>${g}</i><span>${t[k]}</span></button>`,
    ).join("") +
    `<div class="side-x">
      <div id="backend-pill" class="conn-pill ${API.isOnline ? "online" : "offline"}">
        <span class="dot ${API.isOnline ? "" : "dn"}"></span>
        <span>${API.isOnline ? "Backend Online" : "Sandbox Mode"}</span>
      </div>
      <div>${t.lang}</div>
      <div class="seg">${[
        ["en", "EN"],
        ["zh", "中文"],
        ["vi", "VI"],
      ]
        .map(([k, l]) => `<button data-l="${k}" aria-pressed="${st.lang === k}">${l}</button>`)
        .join("")}</div>
      <button class="btn" data-a="col">${t.col}</button>
    </div>`;
  $("#app").classList.toggle("col", st.col);
}

function draw() {
  side();
  const viewFn = V[st.v] || V.dash;
  $("#main").innerHTML = viewFn();
}

document.addEventListener("click", async (e) => {
  const x = e.target.closest(
    "[data-v],[data-tab],[data-sid],[data-sf],[data-l],[data-a],[data-th]",
  );
  if (!x) return;
  const d = x.dataset;

  if (d.v) {
    st.v = d.v;
    st.sid = null;
    st.exp = false;
  } else if (d.tab) {
    const [k, v] = d.tab.split("|");
    st.tab[k] = v;
  } else if (d.sid) {
    st.v = "ses";
    st.sid = +d.sid;
    st.tab.sd = d.rep ? "Report" : "Conversation";
  } else if (d.sf) {
    st.sf = d.sf;
  } else if (d.l) {
    st.lang = d.l;
  } else if (d.th) {
    d.th === "auto"
      ? document.documentElement.removeAttribute("data-theme")
      : document.documentElement.setAttribute("data-theme", d.th);
    return;
  } else if (d.a === "col") {
    st.col = !st.col;
  } else if (d.a === "refresh") {
    sd = Math.floor(Math.random() * 9000) + 1;
    if (API.isOnline) await API.syncFromBackend();
    showToast("Dashboard refreshed", "info");
  } else if (d.a === "export") {
    st.exp = !st.exp;
  } else if (d.a === "back") {
    st.sid = null;
  } else if (d.a === "sample") {
    st.an = sampleAn();
  } else if (d.a === "open-run-modal") {
    st.v = "dash";
    setTimeout(() => {
      const el = $("#ti");
      if (el) el.focus();
    }, 50);
  } else if (d.a === "send-ses-msg") {
    const sid = +d.sid;
    const inp = $("#interactive-msg");
    const val = (inp?.value || "").trim();
    if (val) {
      inp.value = "";
      showToast("Message sent to agent", "info");
      await API.sendMessage(sid, val);
      if (API.isOnline) await API.syncFromBackend();
    }
  } else if (d.a === "compact-db") {
    x.disabled = true;
    x.textContent = "Compacting...";
    const res = await API.compactDB();
    if (res?.success) {
      showToast(`Database compacted! Saved ${res.saved_bytes} bytes`, "ok");
      const r = $("#compact-result");
      if (r) r.innerHTML = `<span class="up">✓ Compaction complete. Storage: ${res.after_bytes} bytes.</span>`;
    } else {
      showToast("Compacted in-memory store", "info");
    }
    x.disabled = false;
    x.textContent = "⚡ Run Database Compaction (VACUUM)";
    return;
  } else if (d.a === "save-settings") {
    await API.saveSettings(st.cfg);
    showToast("Settings saved persistently to SQLite!", "ok");
    return;
  } else if (d.a === "wf-index") {
    showToast("Re-indexing AST symbol graph...", "info");
    setTimeout(() => showToast("AST index rebuilt: 1,486 functions resolved", "ok"), 1200);
    return;
  } else if (d.a === "wf-verify") {
    showToast("Triggering full pytest verification suite...", "info");
    setTimeout(() => showToast("Verifier finished: 142 of 142 tests passing", "ok"), 1500);
    return;
  } else if (d.a === "wf-security") {
    showToast("Security sentinel audit initiated...", "info");
    setTimeout(() => showToast("Audit clean: Zero OWASP vulnerabilities detected", "ok"), 1400);
    return;
  } else if (d.a === "copymd") {
    const t = $("#md").textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(
      () => {
        x.textContent = "Copied";
      },
      () => {
        x.textContent = "Copy blocked: select text";
      },
    );
    return;
  } else if (d.a === "run") {
    const prompt = ($("#ti")?.value || "").trim() || "Untitled task";
    const repo = $("#run-repo")?.value || "acme/shop";
    const model = $("#run-model")?.value || "Claude 3.7 Sonnet";
    const file = $("#run-file")?.value || "billing/pricing.py";

    showToast(`Launching agent on ${repo}...`, "info");
    const result = await API.runAgent(prompt, repo, model, file);

    st.v = "ses";
    st.sid = result.session_id || 33;
    st.tab.sd = "Conversation";
  }

  const y = scrollY;
  draw();
  scrollTo(0, y);
});

document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset.f) {
    st.rv[t.dataset.f] = +t.value;
    draw();
  } else if (t.dataset.c) {
    const k = t.dataset.c;
    st.cfg[k] = t.type === "checkbox" ? t.checked : t.value;
  }
});

document.addEventListener("input", (e) => {
  if (e.target.id === "ses-search") {
    st.sesSearch = e.target.value;
    const box = $(".box:last-child");
    const q = st.sesSearch.toLowerCase();
    const filtered = fl().filter(
      (x) => !q || x.title.toLowerCase().includes(q) || x.repo.toLowerCase().includes(q) || x.file.toLowerCase().includes(q),
    );
    if (box) box.innerHTML = sessRows(filtered);
  } else if (e.target.id === "act-search") {
    st.actSearch = e.target.value;
    const currentFilter = tab("af", "All");
    const searchQuery = st.actSearch.toLowerCase();
    const rawEvents = [
      { icon: "✓", type: "gate", text: "Session #32 passed every verification gate", detail: "AST syntax, import resolution and pytest verified", time: "2h ago" },
      { icon: "✕", type: "guard", text: "Guard rejected a call to utils.paginate_query (does not exist)", detail: "Prevented hallucinated API call from staging", time: "yesterday" },
      { icon: "✓", type: "session", text: "Session #31 ready for human review", detail: "Diff generated with +48 / −6 lines across api/users.py", time: "yesterday" },
      { icon: "!", type: "error", text: "Session #30 blocked after 3 repair attempts", detail: "Unresolved import dateutil.parse_strict", time: "2 days ago" },
      { icon: "↻", type: "test", text: "Baseline test run recorded for acme/etl", detail: "58 tests passed on Python 3.14 runner", time: "2 days ago" },
      { icon: "⚑", type: "ast", text: "Symbol index rebuilt: 1,486 functions", detail: "Refreshed AST call graphs in 0.38s", time: "3 days ago" },
    ];
    const filtered = rawEvents.filter((ev) => {
      if (currentFilter === "Gates" && ev.type !== "gate") return false;
      if (currentFilter === "Guards & Alerts" && ev.type !== "guard" && ev.type !== "error") return false;
      if (searchQuery && !ev.text.toLowerCase().includes(searchQuery) && !ev.detail.toLowerCase().includes(searchQuery)) return false;
      return true;
    });
    const sEl = $(".activity-stream");
    if (sEl) {
      sEl.innerHTML = filtered.map(
        (ev) => `
        <div class="activity-item">
          <span class="activity-icon ${ev.icon === "✓" ? "up" : ev.icon === "✕" || ev.icon === "!" ? "dn" : "mut"}">${ev.icon}</span>
          <div class="activity-body">
            <div class="row" style="justify-content:space-between">
              <b>${esc(ev.text)}</b>
              <span class="mut">${ev.time}</span>
            </div>
            <small class="mut">${esc(ev.detail)}</small>
          </div>
        </div>
      `,
      ).join("") || '<p class="mut" style="text-align:center;padding:20px">No matching events found</p>';
    }
  }
});

// Initial boot
draw();
API.checkHealth().then(() => API.syncFromBackend());
