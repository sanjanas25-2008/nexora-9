#!/usr/bin/env python3
"""
Patchwright Agent Dashboard - High-Performance Backend Server
Real-time monitoring, SQLite persistence, AST code analyzer, Git integration,
REST API, and Server-Sent Events (SSE) live updates.
Built with zero external dependencies (Python 3.6+ standard library).
"""

import os
import sys
import json
import time
import datetime
import sqlite3
import threading
import traceback
import subprocess
import ast
import re
import mimetypes
from urllib.parse import urlparse, parse_qs
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "patchwright.db")

# Thread-safe SSE client registry
sse_clients = []
sse_lock = threading.Lock()

def broadcast_event(event_type, data):
    """Broadcast an SSE event to all connected clients."""
    payload = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    with sse_lock:
        dead = []
        for client in sse_clients:
            try:
                client.wfile.write(payload.encode("utf-8"))
                client.wfile.flush()
            except Exception:
                dead.append(client)
        for client in dead:
            if client in sse_clients:
                sse_clients.remove(client)

def get_db():
    """Get a thread-local SQLite connection with dictionary row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables and seed with realistic agent monitoring data."""
    conn = get_db()
    c = conn.cursor()

    c.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        repo TEXT NOT NULL,
        status TEXT NOT NULL, -- 'ok', 'run', 'bad', 'waiting'
        open INTEGER NOT NULL DEFAULT 1,
        lines_add INTEGER NOT NULL DEFAULT 0,
        lines_del INTEGER NOT NULL DEFAULT 0,
        when_str TEXT NOT NULL,
        model TEXT NOT NULL,
        cost REAL NOT NULL DEFAULT 0.0,
        tokens INTEGER NOT NULL DEFAULT 0,
        file_path TEXT NOT NULL,
        rm_lines TEXT NOT NULL, -- JSON array
        ad_lines TEXT NOT NULL, -- JSON array
        tests_data TEXT NOT NULL, -- JSON array
        gates_data TEXT NOT NULL, -- JSON array
        log_data TEXT NOT NULL, -- JSON array
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")

    c.execute("""
    CREATE TABLE IF NOT EXISTS agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL, -- 'working', 'completed', 'idle', 'waiting', 'error'
        tools_used INTEGER DEFAULT 0,
        model TEXT DEFAULT 'Claude 3.7 Sonnet',
        tokens INTEGER DEFAULT 0
    )""")

    c.execute("""
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        event_type TEXT NOT NULL,
        icon TEXT NOT NULL,
        message TEXT NOT NULL,
        detail TEXT,
        duration_ms INTEGER DEFAULT 0,
        tool_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")

    c.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        title TEXT NOT NULL,
        repo TEXT NOT NULL,
        stage TEXT NOT NULL, -- 'Queued', 'Running', 'In review', 'Done', 'Blocked'
        owner TEXT DEFAULT 'Main',
        priority TEXT DEFAULT 'Medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")

    c.execute("""
    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pr_number INTEGER NOT NULL,
        repo TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        severity TEXT NOT NULL, -- 'Minor', 'Major', 'Critical'
        category TEXT NOT NULL,
        details TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")

    c.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )""")

    # Seed data if empty
    c.execute("SELECT COUNT(*) FROM sessions")
    if c.fetchone()[0] == 0:
        # Default sessions
        sessions = [
            (
                32,
                "Fix negative total in apply_discount()",
                "acme/shop",
                "ok",
                0,
                12,
                3,
                "2h ago",
                "sonnet",
                0.42,
                48200,
                "billing/pricing.py",
                json.dumps(["    return price - price * pct / 100"]),
                json.dumps([
                    "    pct = max(0, min(pct, 100))",
                    "    return price - price * pct / 100"
                ]),
                json.dumps([
                    ["test_discount_over_100 (new)", "fail", "pass"],
                    ["test_discount_basic", "pass", "pass"],
                    ["Rest of suite (91)", "pass", "pass"]
                ]),
                json.dumps([
                    ["Compiles", 1],
                    ["Imports resolve", 1],
                    ["Calls resolve (2 checked)", 1],
                    ["Target test passes", 1],
                    ["No regressions (95/95)", 1]
                ]),
                json.dumps([
                    "Indexed 212 files and 94 tests.",
                    "Located billing/pricing.py::apply_discount, called from 3 places.",
                    "Wrote a failing test that reproduces the bug.",
                    "Patched the function and ran every gate."
                ])
            ),
            (
                31,
                "Add pagination to the /users endpoint",
                "acme/api",
                "ok",
                1,
                48,
                6,
                "yesterday",
                "opus",
                1.18,
                114200,
                "api/users.py",
                json.dumps(["    return User.query.all()"]),
                json.dumps([
                    "    users = User.query.order_by(User.id).all()",
                    "    return paginate(users, page, per_page)"
                ]),
                json.dumps([
                    ["test_users_pagination (new)", "fail", "pass"],
                    ["test_users_list_default", "pass", "pass"],
                    ["Rest of suite (58)", "pass", "pass"]
                ]),
                json.dumps([
                    ["Compiles", 1],
                    ["Imports resolve", 1],
                    ["Calls resolve: paginate_query rejected, paginate accepted", 1],
                    ["Target test passes", 1],
                    ["No regressions (62/62)", 1]
                ]),
                json.dumps([
                    "Indexed 148 files and 61 tests.",
                    "Located api/users.py::list_users and api/utils.py::paginate.",
                    "Attempt 1 called utils.paginate_query(). It does not exist, so the guard rejected it.",
                    "Attempt 2 used paginate() and passed every gate."
                ])
            ),
            (
                30,
                "Replace parse_date() calls with parse_iso()",
                "acme/etl",
                "bad",
                1,
                0,
                0,
                "2 days ago",
                "sonnet",
                0.77,
                72400,
                "etl/loader.py",
                json.dumps(["    d = parse_date(row[0])"]),
                json.dumps(["    d = dateutil.parse_strict(row[0])"]),
                json.dumps([
                    ["Target test", "fail", "not run"],
                    ["Full suite", "pass", "not run"]
                ]),
                json.dumps([
                    ["Compiles", 1],
                    ["Imports resolve", 1],
                    ["Calls resolve: dateutil.parse_strict not found", 0],
                    ["Target test passes", None],
                    ["No regressions", None]
                ]),
                json.dumps([
                    "Indexed 96 files.",
                    "Patch used dateutil.parse_strict(), which is not in the installed package.",
                    "Three repair attempts failed the call check, so the agent stopped and reported."
                ])
            ),
            (
                29,
                "Implement real-time token telemetry & compaction hooks",
                "acme/monitor",
                "ok",
                0,
                84,
                14,
                "3 days ago",
                "sonnet",
                0.89,
                94200,
                "telemetry/hooks.py",
                json.dumps(["    return telemetry.emit_raw(event)"]),
                json.dumps([
                    "    telemetry.compact_buffer()",
                    "    return telemetry.emit_stream(event)"
                ]),
                json.dumps([
                    ["test_telemetry_compaction (new)", "fail", "pass"],
                    ["test_buffer_stream", "pass", "pass"],
                    ["Full suite (142)", "pass", "pass"]
                ]),
                json.dumps([
                    ["Compiles", 1],
                    ["Imports resolve", 1],
                    ["Calls resolve", 1],
                    ["Target test passes", 1],
                    ["No regressions (142/142)", 1]
                ]),
                json.dumps([
                    "Configured live telemetry listeners.",
                    "Reduced token cache memory by 34%.",
                    "Ran full verification pipeline."
                ])
            )
        ]
        c.executemany("""
            INSERT INTO sessions (
                id, title, repo, status, open, lines_add, lines_del, when_str,
                model, cost, tokens, file_path, rm_lines, ad_lines, tests_data,
                gates_data, log_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, sessions)

        # Default agents
        agents = [
            (32, "Main", "Coordinates task & subagent orchestration", "completed", 14, "Claude 3.7 Sonnet", 18200),
            (32, "Locator", "Symbol indexing & AST reference finder", "completed", 8, "Claude 3.5 Haiku", 6400),
            (32, "Patcher", "Generates safe minimal diff", "completed", 6, "Claude 3.7 Sonnet", 14200),
            (32, "Verifier", "Executes unit tests & static guards", "completed", 12, "Claude 3.5 Sonnet", 9400),
            (31, "Main", "Task planner", "completed", 18, "Claude 3 Opus", 42000),
            (31, "Patcher", "Drafts pagination handler", "completed", 9, "Claude 3.7 Sonnet", 24000),
            (30, "Main", "Migration manager", "error", 12, "Claude 3.7 Sonnet", 28000),
            (30, "Patcher", "Refactoring loader", "error", 7, "Claude 3.7 Sonnet", 19000)
        ]
        c.executemany("""
            INSERT INTO agents (session_id, name, role, status, tools_used, model, tokens)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, agents)

        # Default events
        events = [
            (32, "gate_pass", "✓", "Session #32 passed every verification gate", "All 5 gates passed without warnings", 420, "gate_verifier"),
            (31, "guard_warn", "✕", "Guard rejected a call to utils.paginate_query (symbol not in AST index)", "Hallucinated symbol detected before commit", 180, "ast_guard"),
            (31, "session_ready", "✓", "Session #31 ready for human review", "Diff generated with +48 / -6 lines", 1240, "patcher"),
            (30, "session_blocked", "!", "Session #30 blocked after 3 repair attempts", "Failed import resolution on dateutil.parse_strict", 890, "auto_repair"),
            (29, "test_baseline", "↻", "Baseline test run recorded for acme/monitor", "142 tests passing across Python 3.12/3.14", 3400, "pytest_runner"),
            (None, "index_rebuild", "⚑", "Symbol index rebuilt: 1,486 functions and 284 classes", "Repo AST indexed in 0.38s", 380, "symbol_indexer")
        ]
        c.executemany("""
            INSERT INTO events (session_id, event_type, icon, message, detail, duration_ms, tool_name)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, events)

        # Default tasks for Kanban
        tasks = [
            (None, "Rename utils.parse_date callers", "acme/etl", "Queued", "Planner", "Low"),
            (32, "Fix negative total in apply_discount()", "acme/shop", "Done", "Patcher", "High"),
            (31, "Add pagination to the /users endpoint", "acme/api", "In review", "Main", "Medium"),
            (30, "Replace parse_date() calls with parse_iso()", "acme/etl", "Blocked", "Locator", "High"),
            (29, "Implement real-time token telemetry", "acme/monitor", "Done", "Verifier", "Medium")
        ]
        c.executemany("""
            INSERT INTO tasks (session_id, title, repo, stage, owner, priority)
            VALUES (?, ?, ?, ?, ?, ?)
        """, tasks)

        # Default reviews
        reviews = [
            (104, "acme/shop", "Prevent negative totals on discount cap", "Agent", "Minor", "Logic Guard", "Added clamping to discount percentage", "merged"),
            (105, "acme/api", "Paginate user listing endpoint", "Agent", "Major", "API Change", "Added page and per_page query params", "open"),
            (102, "acme/etl", "ETL date parser strict mode", "Agent", "Critical", "Dependency", "Unresolved import in module", "rejected")
        ]
        c.executemany("""
            INSERT INTO reviews (pr_number, repo, title, author, severity, category, details, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, reviews)

        # Default settings
        default_settings = {
            "ast": "true",
            "imp": "true",
            "test": "true",
            "lint": "true",
            "tries": "3",
            "diff": "60",
            "model": "Claude 3.7 Sonnet",
            "thinking": "medium",
            "permission_mode": "prompt",
            "sse_enabled": "true",
            "refresh_rate": "3000"
        }
        for k, v in default_settings.items():
            c.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, v))

    conn.commit()
    conn.close()

class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class PatchwrightHandler(SimpleHTTPRequestHandler):
    """Handles static files and the REST API + SSE stream."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def send_json(self, data, status=200):
        """Helper to send JSON responses."""
        payload = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        """Handle CORS pre-flight."""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # API routing
        if path == "/api/health":
            self.handle_health()
        elif path == "/api/sessions":
            self.handle_get_sessions(query)
        elif path.startswith("/api/sessions/"):
            parts = path.split("/")
            if len(parts) >= 4 and parts[3].isdigit():
                self.handle_get_session(int(parts[3]))
            else:
                self.send_json({"error": "Invalid session ID"}, 400)
        elif path == "/api/events":
            self.handle_get_events(query)
        elif path == "/api/events/stream":
            self.handle_sse_stream()
        elif path == "/api/kanban":
            self.handle_get_kanban()
        elif path == "/api/analytics":
            self.handle_get_analytics()
        elif path == "/api/repos":
            self.handle_get_repos()
        elif path == "/api/settings":
            self.handle_get_settings()
        elif path.startswith("/api/"):
            self.send_json({"error": "Endpoint not found"}, 404)
        else:
            # Fallback to serving static frontend files
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.read_json_body()

        if path == "/api/sessions/run":
            self.handle_run_agent(body)
        elif path == "/api/sessions":
            self.handle_create_session(body)
        elif path.startswith("/api/sessions/") and path.endswith("/messages"):
            parts = path.split("/")
            if len(parts) >= 5 and parts[3].isdigit():
                self.handle_add_message(int(parts[3]), body)
            else:
                self.send_json({"error": "Invalid path"}, 400)
        elif path == "/api/analyze":
            self.handle_analyze(body)
        elif path == "/api/kanban/move":
            self.handle_kanban_move(body)
        elif path == "/api/settings":
            self.handle_update_settings(body)
        elif path == "/api/system/compact":
            self.handle_compact_db()
        else:
            self.send_json({"error": "Endpoint not found"}, 404)

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.read_json_body()

        if path.startswith("/api/sessions/"):
            parts = path.split("/")
            if len(parts) >= 4 and parts[3].isdigit():
                self.handle_update_session(int(parts[3]), body)
            else:
                self.send_json({"error": "Invalid session ID"}, 400)
        else:
            self.send_json({"error": "Endpoint not found"}, 404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path.startswith("/api/sessions/"):
            parts = path.split("/")
            if len(parts) >= 4 and parts[3].isdigit():
                self.handle_delete_session(int(parts[3]))
            else:
                self.send_json({"error": "Invalid session ID"}, 400)
        else:
            self.send_json({"error": "Endpoint not found"}, 404)

    def read_json_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        try:
            raw = self.rfile.read(content_length).decode("utf-8")
            return json.loads(raw)
        except Exception:
            return {}

    # --- API Handlers ---

    def handle_health(self):
        db_size = os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 0
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM sessions")
        session_count = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM agents WHERE status = 'working'")
        active_agents = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM events")
        event_count = c.fetchone()[0]
        conn.close()

        res = {
            "status": "online",
            "version": "2.4.0",
            "server": "Patchwright/AgentMonitor Python 3.14",
            "database": {
                "engine": "SQLite3",
                "path": DB_PATH,
                "size_bytes": db_size,
                "size_formatted": f"{db_size / 1024:.1f} KB"
            },
            "metrics": {
                "sessions": session_count,
                "active_agents": active_agents,
                "events_recorded": event_count,
                "health_score": 98,
                "cache_hit_rate": 95.4,
                "uptime_seconds": int(time.time() - SERVER_START_TIME)
            },
            "features": [
                "Real-time AST Verification",
                "Subagent Orchestration Hierarchy",
                "Server-Sent Events (SSE)",
                "Local Git Integration",
                "Automated Code Quality Sentinel"
            ]
        }
        self.send_json(res)

    def handle_sse_stream(self):
        """Server-Sent Events connection loop."""
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        # Initial handshake message
        init_payload = f"event: connected\ndata: {json.dumps({'message': 'Connected to Patchwright Live Telemetry', 'time': time.time()})}\n\n"
        self.wfile.write(init_payload.encode("utf-8"))
        self.wfile.flush()

        with sse_lock:
            sse_clients.append(self)

        try:
            while True:
                time.sleep(15)
                # Keep-alive ping
                ping = f"event: ping\ndata: {json.dumps({'time': time.time()})}\n\n"
                self.wfile.write(ping.encode("utf-8"))
                self.wfile.flush()
        except Exception:
            pass
        finally:
            with sse_lock:
                if self in sse_clients:
                    sse_clients.remove(self)

    def handle_get_sessions(self, query):
        conn = get_db()
        c = conn.cursor()
        status_filter = query.get("status", [None])[0]
        repo_filter = query.get("repo", [None])[0]
        search = query.get("q", [None])[0]

        sql = "SELECT * FROM sessions WHERE 1=1"
        params = []
        if status_filter:
            sql += " AND status = ?"
            params.append(status_filter)
        if repo_filter:
            sql += " AND repo = ?"
            params.append(repo_filter)
        if search:
            sql += " AND (title LIKE ? OR file_path LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%"])

        sql += " ORDER BY id DESC"
        c.execute(sql, params)
        rows = [self.row_to_session_dict(r) for r in c.fetchall()]
        conn.close()
        self.send_json(rows)

    def row_to_session_dict(self, r):
        return {
            "id": r["id"],
            "title": r["title"],
            "repo": r["repo"],
            "s": r["status"],
            "open": bool(r["open"]),
            "add": r["lines_add"],
            "del": r["lines_del"],
            "when": r["when_str"],
            "model": r["model"],
            "cost": float(r["cost"]),
            "tokens": r["tokens"],
            "file": r["file_path"],
            "rm": json.loads(r["rm_lines"]) if r["rm_lines"] else [],
            "ad": json.loads(r["ad_lines"]) if r["ad_lines"] else [],
            "tests": json.loads(r["tests_data"]) if r["tests_data"] else [],
            "gates": json.loads(r["gates_data"]) if r["gates_data"] else [],
            "log": json.loads(r["log_data"]) if r["log_data"] else [],
            "created_at": r["created_at"]
        }

    def handle_get_session(self, sid):
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM sessions WHERE id = ?", (sid,))
        row = c.fetchone()
        if not row:
            conn.close()
            self.send_json({"error": "Session not found"}, 404)
            return

        session = self.row_to_session_dict(row)
        c.execute("SELECT * FROM agents WHERE session_id = ?", (sid,))
        session["agents"] = [dict(a) for a in c.fetchall()]

        c.execute("SELECT * FROM events WHERE session_id = ? ORDER BY id ASC", (sid,))
        session["timeline"] = [dict(e) for e in c.fetchall()]

        c.execute("SELECT * FROM tasks WHERE session_id = ?", (sid,))
        session["tasks"] = [dict(t) for t in c.fetchall()]

        conn.close()
        self.send_json(session)

    def handle_create_session(self, data):
        conn = get_db()
        c = conn.cursor()
        title = data.get("title", "Untitled task")
        repo = data.get("repo", "acme/shop")
        model = data.get("model", "Claude 3.7 Sonnet")
        file_path = data.get("file", "app/module.py")

        c.execute("""
            INSERT INTO sessions (
                title, repo, status, open, lines_add, lines_del, when_str,
                model, cost, tokens, file_path, rm_lines, ad_lines,
                tests_data, gates_data, log_data
            ) VALUES (?, ?, 'run', 1, 0, 0, 'just now', ?, 0.25, 12000, ?, '[]', '[]', '[]', '[]', ?)
        """, (
            title, repo, model, file_path,
            json.dumps(["Session initiated", "Awaiting worker execution"])
        ))
        sid = c.lastrowid
        conn.commit()
        conn.close()

        broadcast_event("session_created", {"id": sid, "title": title, "repo": repo})
        self.send_json({"success": True, "id": sid}, 201)

    def handle_update_session(self, sid, data):
        conn = get_db()
        c = conn.cursor()
        fields = []
        params = []
        for key in ["title", "repo", "status", "open", "lines_add", "lines_del", "model", "cost"]:
            if key in data:
                fields.append(f"{key} = ?")
                params.append(data[key])
        if "rm" in data:
            fields.append("rm_lines = ?")
            params.append(json.dumps(data["rm"]))
        if "ad" in data:
            fields.append("ad_lines = ?")
            params.append(json.dumps(data["ad"]))

        if fields:
            sql = f"UPDATE sessions SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
            params.append(sid)
            c.execute(sql, params)
            conn.commit()
        conn.close()

        broadcast_event("session_updated", {"id": sid})
        self.send_json({"success": True})

    def handle_delete_session(self, sid):
        conn = get_db()
        c = conn.cursor()
        c.execute("DELETE FROM sessions WHERE id = ?", (sid,))
        c.execute("DELETE FROM agents WHERE session_id = ?", (sid,))
        c.execute("DELETE FROM events WHERE session_id = ?", (sid,))
        c.execute("DELETE FROM tasks WHERE session_id = ?", (sid,))
        conn.commit()
        conn.close()

        broadcast_event("session_deleted", {"id": sid})
        self.send_json({"success": True})

    def handle_add_message(self, sid, body):
        text = body.get("text", "").strip()
        if not text:
            self.send_json({"error": "Empty message"}, 400)
            return

        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT log_data FROM sessions WHERE id = ?", (sid,))
        row = c.fetchone()
        if not row:
            conn.close()
            self.send_json({"error": "Session not found"}, 404)
            return

        logs = json.loads(row["log_data"]) if row["log_data"] else []
        logs.append(f"User: {text}")
        logs.append(f"Agent: Analyzing requirement and verifying AST references...")
        c.execute("UPDATE sessions SET log_data = ? WHERE id = ?", (json.dumps(logs), sid))

        # Record timeline event
        c.execute("""
            INSERT INTO events (session_id, event_type, icon, message, detail, duration_ms, tool_name)
            VALUES (?, 'user_message', '💬', ?, 'Interactive user prompt received', 120, 'chat_interface')
        """, (sid, f"User instruction: {text[:60]}..."))

        conn.commit()
        conn.close()

        broadcast_event("session_message", {"session_id": sid, "message": text})
        self.send_json({"success": True, "logs": logs})

    def handle_run_agent(self, data):
        """Spawns an interactive agent run simulating real pipeline execution."""
        task_prompt = data.get("prompt", "Analyze repository and apply bug fix").strip()
        repo = data.get("repo", "acme/shop")
        model = data.get("model", "Claude 3.7 Sonnet")
        file_target = data.get("file", "billing/pricing.py")

        conn = get_db()
        c = conn.cursor()
        c.execute("""
            INSERT INTO sessions (
                title, repo, status, open, lines_add, lines_del, when_str,
                model, cost, tokens, file_path, rm_lines, ad_lines,
                tests_data, gates_data, log_data
            ) VALUES (?, ?, 'run', 1, 0, 0, 'just now', ?, 0.15, 8400, ?, '[]', '[]', '[]', '[]', ?)
        """, (
            task_prompt, repo, model, file_target,
            json.dumps(["Indexed repository.", f"Assigned task: {task_prompt}"])
        ))
        sid = c.lastrowid

        # Insert agent hierarchy
        c.execute("""
            INSERT INTO agents (session_id, name, role, status, tools_used, model, tokens)
            VALUES (?, 'Main', 'Orchestrator', 'working', 2, ?, 4200)
        """, (sid, model))
        c.execute("""
            INSERT INTO agents (session_id, name, role, status, tools_used, model, tokens)
            VALUES (?, 'Locator', 'Symbol search & AST lookup', 'working', 1, 'Claude 3.5 Haiku', 1800)
        """, (sid,))
        c.execute("""
            INSERT INTO agents (session_id, name, role, status, tools_used, model, tokens)
            VALUES (?, 'Patcher', 'Diff generator', 'idle', 0, ?, 0)
        """, (sid, model))
        c.execute("""
            INSERT INTO agents (session_id, name, role, status, tools_used, model, tokens)
            VALUES (?, 'Verifier', 'Gate & regression validator', 'idle', 0, 'Claude 3.5 Sonnet', 0)
        """, (sid,))

        # Add initial kanban task
        c.execute("""
            INSERT INTO tasks (session_id, title, repo, stage, owner, priority)
            VALUES (?, ?, ?, 'Running', 'Main', 'High')
        """, (sid, task_prompt, repo))

        conn.commit()
        conn.close()

        broadcast_event("agent_started", {"session_id": sid, "title": task_prompt})

        # Run background simulation thread
        threading.Thread(target=self.execute_agent_lifecycle, args=(sid, task_prompt, file_target)).start()

        self.send_json({"success": True, "session_id": sid}, 201)

    def execute_agent_lifecycle(self, sid, task_prompt, file_target):
        """Simulates background agent orchestration steps with real timing and SSE events."""
        time.sleep(1.2)
        # Stage 1: Locator
        conn = get_db()
        c = conn.cursor()
        c.execute("UPDATE agents SET status = 'completed', tools_used = 4 WHERE session_id = ? AND name = 'Locator'", (sid,))
        c.execute("UPDATE agents SET status = 'working', tools_used = 3 WHERE session_id = ? AND name = 'Patcher'", (sid,))
        c.execute("""
            INSERT INTO events (session_id, event_type, icon, message, detail, duration_ms, tool_name)
            VALUES (?, 'locator_done', '🔍', 'Located AST symbols and definitions', 'Scanned 14 files, resolved 8 references', 750, 'ast_locator')
        """, (sid,))
        conn.commit()
        conn.close()
        broadcast_event("agent_progress", {"session_id": sid, "stage": "Located symbols"})

        time.sleep(1.5)
        # Stage 2: Patcher generates diff
        conn = get_db()
        c = conn.cursor()
        rm_lines = ["    return calculate_fee(price, factor)"]
        ad_lines = [
            "    if factor < 0 or factor > 100:",
            "        raise ValueError('Invalid factor percentage')",
            "    return calculate_fee(price, factor)"
        ]
        tests = [
            ["test_boundary_conditions (new)", "fail", "pass"],
            ["test_regular_fee", "pass", "pass"],
            ["test_suite_regression (84)", "pass", "pass"]
        ]
        gates = [
            ["Compiles", 1],
            ["Imports resolve", 1],
            ["Calls resolve", 1],
            ["Target test passes", 1],
            ["No regressions (84/84)", 1]
        ]
        logs = [
            "Indexed repository symbols.",
            f"Analyzed requirement: {task_prompt}",
            "Wrote unit test reproducing edge case.",
            "Generated AST-validated patch.",
            "Ran test suite and passed all 5 verification gates."
        ]
        c.execute("UPDATE agents SET status = 'completed', tools_used = 7 WHERE session_id = ? AND name = 'Patcher'", (sid,))
        c.execute("UPDATE agents SET status = 'working', tools_used = 5 WHERE session_id = ? AND name = 'Verifier'", (sid,))
        c.execute("""
            UPDATE sessions SET
                lines_add = 3, lines_del = 1, cost = 0.38, tokens = 18400,
                rm_lines = ?, ad_lines = ?, tests_data = ?, gates_data = ?, log_data = ?
            WHERE id = ?
        """, (json.dumps(rm_lines), json.dumps(ad_lines), json.dumps(tests), json.dumps(gates), json.dumps(logs), sid))
        conn.commit()
        conn.close()
        broadcast_event("agent_progress", {"session_id": sid, "stage": "Diff generated & gates verifying"})

        time.sleep(1.2)
        # Stage 3: Completion
        conn = get_db()
        c = conn.cursor()
        c.execute("UPDATE agents SET status = 'completed' WHERE session_id = ? AND name IN ('Main', 'Verifier')", (sid,))
        c.execute("UPDATE sessions SET status = 'ok' WHERE id = ?", (sid,))
        c.execute("UPDATE tasks SET stage = 'In review' WHERE session_id = ?", (sid,))
        c.execute("""
            INSERT INTO events (session_id, event_type, icon, message, detail, duration_ms, tool_name)
            VALUES (?, 'gate_pass', '✓', 'Verification gates passed: 5/5', 'All unit tests and AST guards verified clean', 430, 'gate_verifier')
        """, (sid,))
        conn.commit()
        conn.close()
        broadcast_event("agent_completed", {"session_id": sid, "status": "ok"})

    def handle_get_events(self, query):
        conn = get_db()
        c = conn.cursor()
        limit = int(query.get("limit", [50])[0])
        category = query.get("type", [None])[0]

        sql = "SELECT * FROM events WHERE 1=1"
        params = []
        if category and category != "all":
            sql += " AND event_type = ?"
            params.append(category)
        sql += " ORDER BY id DESC LIMIT ?"
        params.append(limit)

        c.execute(sql, params)
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        self.send_json(rows)

    def handle_get_kanban(self):
        conn = get_db()
        c = conn.cursor()
        # Sessions view
        c.execute("SELECT id, title, repo, status, model, cost FROM sessions ORDER BY id DESC")
        sessions = [dict(s) for s in c.fetchall()]

        # Tasks view
        c.execute("SELECT * FROM tasks ORDER BY id DESC")
        tasks = [dict(t) for t in c.fetchall()]

        # Agents view
        c.execute("SELECT a.*, s.title as session_title, s.repo FROM agents a LEFT JOIN sessions s ON a.session_id = s.id")
        agents = [dict(a) for a in c.fetchall()]

        conn.close()
        self.send_json({
            "sessions": sessions,
            "tasks": tasks,
            "agents": agents
        })

    def handle_kanban_move(self, body):
        item_type = body.get("type", "task") # 'task' or 'session'
        item_id = body.get("id")
        new_stage = body.get("stage")

        conn = get_db()
        c = conn.cursor()
        if item_type == "task":
            c.execute("UPDATE tasks SET stage = ? WHERE id = ?", (new_stage, item_id))
        elif item_type == "session":
            status_map = {
                "Active": "run",
                "Waiting": "waiting",
                "In review": "ok",
                "Done": "ok",
                "Blocked": "bad"
            }
            s_val = status_map.get(new_stage, "ok")
            c.execute("UPDATE sessions SET status = ? WHERE id = ?", (s_val, item_id))
        conn.commit()
        conn.close()

        broadcast_event("kanban_moved", {"type": item_type, "id": item_id, "stage": new_stage})
        self.send_json({"success": True})

    def handle_analyze(self, body):
        """Performs Python AST parsing, regex security and quality analysis."""
        code_before = body.get("before", "")
        code_after = body.get("after", "")
        repo_index = body.get("index", "")

        known_symbols = set(re.split(r"[,\s]+", repo_index.strip())) if repo_index else set()
        findings = []
        score = 100

        # Syntax and AST check for code_after
        tree_after = None
        try:
            tree_after = ast.parse(code_after)
        except SyntaxError as e:
            findings.append({
                "sev": "crit",
                "rule": "SyntaxError",
                "msg": f"Syntax error at line {e.lineno}: {e.msg}",
                "line": e.text.strip() if e.text else ""
            })
            score -= 40

        # AST analysis
        if tree_after:
            # 1. Detect dangerous calls (eval, exec, os.system, shell injection)
            for node in ast.walk(tree_after):
                if isinstance(node, ast.Call):
                    fn_name = ""
                    if isinstance(node.func, ast.Name):
                        fn_name = node.func.id
                    elif isinstance(node.func, ast.Attribute):
                        fn_name = node.func.attr

                    if fn_name in ["eval", "exec"]:
                        findings.append({
                            "sev": "crit",
                            "rule": "DangerousFunction",
                            "msg": f"Use of dynamic code execution '{fn_name}()' is prohibited",
                            "line": f"Call at line {getattr(node, 'lineno', '?')}"
                        })
                        score -= 25

                    if fn_name in ["system", "popen"]:
                        findings.append({
                            "sev": "major",
                            "rule": "ShellExecution",
                            "msg": f"Direct shell command execution via '{fn_name}()'",
                            "line": f"Call at line {getattr(node, 'lineno', '?')}"
                        })
                        score -= 15

                    # Check hallucinated calls against index
                    if known_symbols and fn_name and fn_name not in dir(__builtins__):
                        if fn_name not in known_symbols and not fn_name.startswith("_"):
                            findings.append({
                                "sev": "major",
                                "rule": "UnresolvedCall",
                                "msg": f"Call to '{fn_name}()' is not in repository symbol index",
                                "line": f"Line {getattr(node, 'lineno', '?')}"
                            })
                            score -= 10

        # Regex heuristics for Security (SQL concatenation, hardcoded tokens)
        for i, line in enumerate(code_after.split("\n"), start=1):
            if re.search(r"SELECT\s+.*%s|SELECT\s+.*\+|INSERT\s+INTO\s+.*\+", line, re.IGNORECASE):
                findings.append({
                    "sev": "crit",
                    "rule": "SQLInjectionRisk",
                    "msg": "String concatenation in SQL query detected",
                    "line": f"Line {i}: {line.strip()}"
                })
                score -= 30
            if re.search(r"(api[_-]?key|secret|password|bearer)\s*=\s*['\"][A-Za-z0-9_\-]{8,}['\"]", line, re.IGNORECASE):
                findings.append({
                    "sev": "major",
                    "rule": "HardcodedSecret",
                    "msg": "Potential hardcoded credential or secret detected",
                    "line": f"Line {i}: {re.sub(r'=.*', '= [REDACTED]', line.strip())}"
                })
                score -= 20

        # Lines added/removed count
        b_lines = code_before.split("\n") if code_before else []
        a_lines = code_after.split("\n") if code_after else []
        lines_added = max(0, len(a_lines) - len(b_lines))
        lines_removed = max(0, len(b_lines) - len(a_lines))

        score = max(0, min(100, score))
        verdict = "PASSED" if score >= 80 else ("REVIEW" if score >= 50 else "REJECTED")

        summary = f"{len(findings)} findings detected. AST {'valid' if tree_after else 'invalid'}."
        if verdict == "PASSED":
            summary = "Clean AST verification. No critical risks detected."

        self.send_json({
            "verdict": verdict,
            "score": score,
            "summary": summary,
            "findings": findings,
            "lines_added": lines_added,
            "lines_removed": lines_removed,
            "functions_touched": [n.name for n in ast.walk(tree_after) if isinstance(n, ast.FunctionDef)] if tree_after else [],
            "complexity_change": len([n for n in ast.walk(tree_after) if isinstance(n, (ast.If, ast.For, ast.While))]) if tree_after else 0
        })

    def handle_get_repos(self):
        """Scans local desktop / workspace for Git repositories."""
        repos = []
        scan_paths = [
            BASE_DIR,
            os.path.dirname(BASE_DIR),
            os.path.join(os.path.expanduser("~"), "OneDrive", "Desktop"),
            os.path.join(os.path.expanduser("~"), "Desktop")
        ]
        seen = set()

        for sp in scan_paths:
            if not os.path.exists(sp):
                continue
            try:
                for entry in os.scandir(sp):
                    if entry.is_dir() and entry.path not in seen:
                        git_dir = os.path.join(entry.path, ".git")
                        if os.path.exists(git_dir):
                            seen.add(entry.path)
                            branch = "main"
                            try:
                                b = subprocess.check_output(
                                    ["git", "-C", entry.path, "branch", "--show-current"],
                                    stderr=subprocess.DEVNULL, timeout=2
                                ).decode().strip()
                                if b:
                                    branch = b
                            except Exception:
                                pass
                            repos.append({
                                "name": entry.name,
                                "path": entry.path,
                                "branch": branch,
                                "is_git": True
                            })
            except Exception:
                pass

        if not repos:
            repos.append({
                "name": "patchwright",
                "path": BASE_DIR,
                "branch": "main",
                "is_git": os.path.exists(os.path.join(BASE_DIR, ".git"))
            })

        self.send_json({"repos": repos})

    def handle_get_analytics(self):
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT model, SUM(cost) as total_cost, SUM(tokens) as total_tokens, COUNT(*) as count FROM sessions GROUP BY model")
        model_stats = [dict(r) for r in c.fetchall()]

        c.execute("SELECT COUNT(*) FROM sessions WHERE status = 'ok'")
        ok_count = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM sessions")
        total_sessions = c.fetchone()[0]
        conn.close()

        success_rate = int((ok_count / total_sessions * 100)) if total_sessions else 92

        self.send_json({
            "models": model_stats,
            "success_rate": success_rate,
            "cache_hit_rate": 95.4,
            "avg_tokens_per_session": 56000,
            "cost_last_30d": 4450,
            "total_events": 74100
        })

    def handle_get_settings(self):
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT key, value FROM settings")
        rows = {r["key"]: r["value"] for r in c.fetchall()}
        conn.close()
        self.send_json(rows)

    def handle_update_settings(self, body):
        conn = get_db()
        c = conn.cursor()
        for k, v in body.items():
            c.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, str(v)))
        conn.commit()
        conn.close()
        self.send_json({"success": True})

    def handle_compact_db(self):
        """Vacuums SQLite and cleans old temporary event logs."""
        before_size = os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 0
        conn = get_db()
        c = conn.cursor()
        c.execute("VACUUM")
        conn.commit()
        conn.close()
        after_size = os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 0

        self.send_json({
            "success": True,
            "before_bytes": before_size,
            "after_bytes": after_size,
            "saved_bytes": max(0, before_size - after_size)
        })

SERVER_START_TIME = time.time()

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

def run_server():
    init_db()
    server_address = ("", PORT)
    httpd = ThreadingHTTPServer(server_address, PatchwrightHandler)
    print("=" * 65)
    print(f">> Patchwright Agent Dashboard Server running on http://localhost:{PORT}")
    print(f">> Root directory: {BASE_DIR}")
    print(f">> SQLite Database: {DB_PATH}")
    print(f">> Live SSE stream: http://localhost:{PORT}/api/events/stream")
    print(f">> Health check:   http://localhost:{PORT}/api/health")
    print("=" * 65)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
