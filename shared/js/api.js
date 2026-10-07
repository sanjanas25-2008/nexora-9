/* API client for Patchwright Backend
   Connects to Python SQLite REST server + SSE live telemetry.
   Gracefully falls back to client-side data if server is offline. */

const API = {
  isOnline: false,
  baseUrl: window.location.origin.startsWith("http") ? "" : "http://localhost:8000",
  sse: null,

  async checkHealth() {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        this.isOnline = true;
        this.updateConnectionPill(true, data);
        this.initSSE();
        return data;
      }
    } catch (e) {
      // Server not reachable
    }
    this.isOnline = false;
    this.updateConnectionPill(false);
    return null;
  },

  updateConnectionPill(online, data) {
    const el = document.getElementById("backend-pill");
    if (!el) return;
    if (online) {
      el.className = "conn-pill online";
      el.innerHTML = `<span class="dot"></span><span>Backend Online (SQLite · ${data?.database?.size_formatted || "Active"})</span>`;
      el.title = `Server: ${data?.server || "Python 3.14"}\nUptime: ${data?.metrics?.uptime_seconds || 0}s\nHealth: ${data?.metrics?.health_score || 98}%`;
    } else {
      el.className = "conn-pill offline";
      el.innerHTML = `<span class="dot dn"></span><span>Local Sandbox (Run start-server.bat)</span>`;
      el.title = "Running in browser sandbox mode. Start 'start-server.bat' to enable persistent SQLite & live telemetry.";
    }
  },

  initSSE() {
    if (this.sse || !window.EventSource) return;
    try {
      this.sse = new EventSource(`${this.baseUrl}/api/events/stream`);
      this.sse.addEventListener("connected", (e) => {
        console.log("[Patchwright SSE] Live telemetry connected:", JSON.parse(e.data));
      });
      this.sse.addEventListener("agent_started", (e) => {
        const d = JSON.parse(e.data);
        showToast(`Agent started: ${d.title}`, "info");
        this.syncFromBackend();
      });
      this.sse.addEventListener("agent_progress", (e) => {
        const d = JSON.parse(e.data);
        showToast(`Agent update: ${d.stage}`, "info");
        this.syncFromBackend();
      });
      this.sse.addEventListener("agent_completed", (e) => {
        const d = JSON.parse(e.data);
        showToast(`Agent completed session #${d.session_id}!`, "ok");
        this.syncFromBackend();
      });
      this.sse.addEventListener("session_created", () => this.syncFromBackend());
      this.sse.addEventListener("session_updated", () => this.syncFromBackend());
      this.sse.addEventListener("kanban_moved", () => this.syncFromBackend());
      this.sse.onerror = () => {
        this.sse?.close();
        this.sse = null;
        setTimeout(() => this.checkHealth(), 5000);
      };
    } catch (err) {
      console.warn("SSE initialization skipped:", err);
    }
  },

  async syncFromBackend() {
    if (!this.isOnline) return;
    try {
      const res = await fetch(`${this.baseUrl}/api/sessions`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Update global sessions array in place
          S.length = 0;
          data.forEach((s) => S.push(s));
          if (typeof draw === "function") draw();
        }
      }
    } catch (e) {
      console.error("Sync error:", e);
    }
  },

  async getSessions(query = {}) {
    if (!this.isOnline) return S;
    const params = new URLSearchParams(query);
    const res = await fetch(`${this.baseUrl}/api/sessions?${params}`);
    return res.ok ? await res.json() : S;
  },

  async getSession(id) {
    if (!this.isOnline) return S.find((x) => x.id === id);
    const res = await fetch(`${this.baseUrl}/api/sessions/${id}`);
    return res.ok ? await res.json() : S.find((x) => x.id === id);
  },

  async runAgent(prompt, repo = "acme/shop", model = "Claude 3.7 Sonnet", file = "billing/pricing.py") {
    if (!this.isOnline) {
      // Fallback in-memory
      const s = gen(prompt || "Untitled task");
      s.model = model;
      s.repo = repo;
      S.unshift(s);
      return { success: true, session_id: s.id };
    }
    const res = await fetch(`${this.baseUrl}/api/sessions/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, repo, model, file }),
    });
    return await res.json();
  },

  async sendMessage(sessionId, text) {
    if (!this.isOnline) {
      const s = S.find((x) => x.id === sessionId);
      if (s) {
        s.log.push(`User: ${text}`);
        s.log.push(`Agent: Analyzed AST structure for '${text.slice(0, 30)}...'`);
      }
      return { success: true };
    }
    const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return await res.json();
  },

  async getKanban() {
    if (!this.isOnline) return null;
    const res = await fetch(`${this.baseUrl}/api/kanban`);
    return res.ok ? await res.json() : null;
  },

  async moveKanban(type, id, stage) {
    if (!this.isOnline) return { success: true };
    const res = await fetch(`${this.baseUrl}/api/kanban/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, stage }),
    });
    return await res.json();
  },

  async analyze(before, after, index) {
    if (!this.isOnline) return null;
    try {
      const res = await fetch(`${this.baseUrl}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ before, after, index }),
      });
      return res.ok ? await res.json() : null;
    } catch (e) {
      return null;
    }
  },

  async getEvents(type = "all", limit = 50) {
    if (!this.isOnline) return null;
    const res = await fetch(`${this.baseUrl}/api/events?type=${type}&limit=${limit}`);
    return res.ok ? await res.json() : null;
  },

  async getRepos() {
    if (!this.isOnline) return [{ name: "acme/shop", path: "C:\\Users\\girij\\OneDrive\\Desktop\\patchwright", branch: "main", is_git: true }];
    const res = await fetch(`${this.baseUrl}/api/repos`);
    return res.ok ? (await res.json()).repos : [];
  },

  async compactDB() {
    if (!this.isOnline) return null;
    const res = await fetch(`${this.baseUrl}/api/system/compact`, { method: "POST" });
    return await res.json();
  },

  async saveSettings(cfg) {
    if (!this.isOnline) return { success: true };
    const res = await fetch(`${this.baseUrl}/api/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    return await res.json();
  },
};

// Toast notification helper
function showToast(message, type = "info") {
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${type === "ok" ? "✓" : type === "bad" ? "✕" : "ℹ"}</span><span>${esc(message)}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}
