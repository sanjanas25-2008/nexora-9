# NEXORA — Patchwright
## AI Software Engineering Agent

> **Don't trust the AI. Verify the patch.**

NEXORA (Patchwright) is an AI Software Engineering Agent designed to understand an existing software repository, analyze a requested change or bug, identify the relevant parts of the codebase, and verify that a proposed change does not break existing functionality.

The system follows the principle:

**Probabilistic Intelligence + Deterministic Verification**

AI is used for reasoning and code-change suggestions, while deterministic analysis and testing are used to verify the result.

---

## 1. Problem Statement

Modern software projects contain thousands of lines of code distributed across frontend files, backend services, APIs, databases, tests, configuration files, and documentation.

When a developer requests a change or bug fix, they must first understand:

- Where the relevant code is located
- Which functions are affected
- How different files are connected
- What the existing behaviour is
- What needs to be changed
- Whether the modification breaks existing functionality

The HackNex problem statement requires an agent that can:

1. Read an existing codebase
2. Understand how it works
3. Make a requested change or fix a bug
4. Verify that existing functionality still works

NEXORA addresses this problem through repository analysis, code reasoning, controlled modification, and deterministic verification.

---

# 2. Solution

NEXORA acts as an AI-powered software engineering assistant.

The overall workflow is:

Developer Task
      |
      v
Repository Analysis
      |
      v
Relevant Files / Functions
      |
      v
Task Understanding
      |
      v
Root Cause Analysis
      |
      v
Change Planning
      |
      v
Controlled Code Modification
      |
      v
Deterministic Validation
      |
      v
Automated Testing
      |
      v
Regression Detection
      |
      v
Evidence / Final Result

The important design principle is that the AI does not have the final authority.

AI proposes a change
        |
        v
Deterministic checks verify it
        |
        v
Tests confirm the behaviour
        |
        v
Patch is accepted or rejected
3. Key Features
Current System

The current Patchwright repository provides:

Interactive dashboard
Python backend server
SQLite database
REST API
Server-Sent Events (SSE)
Session management
Agent/task monitoring
Kanban workflow
Change analysis
Code-quality monitoring
Review tracking
Analytics
Settings management
Repository information
Git integration support
Python AST-based code analysis capabilities
Real-time event updates
Backend health monitoring
Agent-Oriented Workflow

The project is designed around the following software repair workflow:

Read the repository
Understand the repository structure
Analyze relevant source files
Understand the developer request
Identify the likely root cause
Plan a minimal modification
Apply the modification
Validate the modified code
Run tests
Compare baseline and patched results
Detect regressions
Produce an evidence-based result

5. Data Pipeline

The system processes the developer request through multiple stages.

Stage 1 — Input

The developer provides:

Repository
+
Bug / Feature Request

Example:

Repository:
acme/shop

Task:
Fix the negative total produced by
apply_discount() without breaking
the existing checkout workflow.
Stage 2 — Repository Collection

The agent reads the existing repository and collects information such as:

File names
Source files
Python modules
Classes
Functions
Imports
Function relationships
Test files
Relevant source code

This allows the system to work with the actual codebase instead of inventing code or APIs.

Stage 3 — Code Analysis

Python source files can be analyzed using Python's ast module.

The structure can be represented as:

Module
 |
 +-- Imports
 |
 +-- Classes
 |     |
 |     +-- Methods
 |
 +-- Functions
       |
       +-- Function Calls

AST-based analysis provides structural information about the repository.

Stage 4 — Task Understanding

The reasoning layer converts the natural-language request into a structured engineering task.

Task
 |
 v
Relevant Module
 |
 v
Relevant Function
 |
 v
Possible Root Cause
 |
 v
Required Modification

The goal is to modify only the relevant parts of the codebase.

Stage 5 — Patch Generation

The proposed modification is applied in a controlled manner.

The system should avoid blindly rewriting the entire repository.

Instead, the patch is limited to:

Relevant files
Relevant functions
Required changes
Minimal modifications
Stage 6 — Deterministic Verification

The modified code is checked before it is considered successful.

Possible checks include:

Syntax Validation
       |
       v
AST Validation
       |
       v
Import Validation
       |
       v
Symbol Validation
       |
       v
Linting
       |
       v
Automated Tests
Stage 7 — Regression Detection

Existing tests are executed before and after the change.

Example:

BEFORE PATCH

Test A  PASS
Test B  PASS
Test C  PASS
Test D  FAIL


AFTER PATCH

Test A  PASS
Test B  PASS
Test C  PASS
Test D  PASS

The ideal repair:

Fixes the reported failure
Keeps previously passing tests passing
Introduces no new regression
6. Core Model / Reasoning

NEXORA uses a hybrid AI and deterministic verification approach.

AI Reasoning

The AI reasoning layer is responsible for tasks such as:

Understanding natural-language requirements
Identifying likely root causes
Selecting relevant code
Planning a modification
Explaining the proposed change

AI is useful for reasoning over large and complex codebases.

However, AI-generated output is probabilistic.

Therefore, it is not treated as the final authority.

Deterministic Verification

The verification layer provides objective checks.

AST Validation

Checks whether modified Python code remains syntactically valid.

Import Validation

Checks whether referenced imports and modules are valid.

Symbol Validation

Checks whether referenced functions and classes exist.

Test Verification

Runs the existing automated test suite.

Regression Detection

Compares baseline and patched test results.

The central idea is:

AI:
"What should we change?"

Verifier:
"Did the change actually work?"
7. Evidence and Explainability

NEXORA is designed to provide evidence for every repair attempt.

Instead of returning only:

"Bug fixed successfully."

the system can provide:

Task:
Fix negative total in apply_discount()

Affected File:
shop/discount.py

Affected Function:
apply_discount()

Root Cause:
Discount calculation allowed the final
price to become negative.

Patch:
Added a lower bound to the calculated total.

Baseline Tests:
18 passed
1 failed

Final Tests:
19 passed
0 failed

Regressions:
0

Syntax Validation:
PASS

Import Validation:
PASS

Final Verdict:
PATCH ACCEPTED

This makes the system easier to evaluate and debug.

8. Sample Input
Developer Request
Fix the negative total bug in apply_discount()
while keeping the existing checkout workflow working.

Example repository:

shop/
|
+-- app.py
+-- discount.py
+-- cart.py
+-- checkout.py
|
+-- tests/
      |
      +-- test_discount.py
      +-- test_checkout.py
9. Sample Processing

The system identifies the relevant source:

Relevant File:
shop/discount.py

Relevant Function:
apply_discount()

Related Tests:
tests/test_discount.py
tests/test_checkout.py

Suppose the original behaviour is:

price = 100
discount = 150

result = 100 - 150

result = -50

This is incorrect because the final amount should not be negative.

The required behaviour is:

result >= 0

The agent therefore proposes a minimal change that prevents the calculated total from becoming negative.

10. Sample Output
==================================================
PATCHWRIGHT VERIFICATION REPORT
==================================================

Task:
Fix negative total in apply_discount()

Repository:
acme/shop

Affected File:
shop/discount.py

Affected Function:
apply_discount()

Root Cause:
Discount calculation allowed the resulting
total to become negative.

Patch Status:
APPLIED

--------------------------------------------------
VALIDATION
--------------------------------------------------

Syntax Check        : PASS
AST Validation      : PASS
Import Validation   : PASS
Lint Check          : PASS

--------------------------------------------------
TEST RESULTS
--------------------------------------------------

Baseline:
18 passed
1 failed

Patched:
19 passed
0 failed

New Failures:
0

Regressions:
0

--------------------------------------------------
FINAL VERDICT
--------------------------------------------------

PATCH ACCEPTED

Reason:
The reported failure was resolved and no
previously passing tests were broken.

==================================================
11. Technologies Used
Frontend
HTML5
CSS3
JavaScript
Browser APIs

The dashboard uses a modular page structure.

Backend
Python
Python Standard Library
http.server
sqlite3
ast
subprocess
Git
Server-Sent Events (SSE)

The current backend does not require Flask or FastAPI.

Database

SQLite is used for local persistence.

The database contains information related to:

Sessions
Agents
Events
Tasks
Reviews
Settings
AI Layer

The architecture supports an LLM-based reasoning layer.

The model layer is designed to be separated from repository analysis and deterministic verification.

This allows the reasoning model to be changed without redesigning the verification system.

12. Project Structure
nexora-9/
|
+-- index.html
+-- server.py
+-- patchwright.db
+-- README.md
+-- run.bat
+-- start-server.bat
|
+-- pages/
|   |
|   +-- dashboard/
|   +-- kanban-board/
|   +-- sessions/
|   +-- change-analyzer/
|   +-- activity-feed/
|   +-- analytics/
|   +-- code-quality/
|   +-- reviews/
|   +-- workflows/
|   +-- settings/
|
+-- shared/
    |
    +-- css/
    |
    +-- js/
13. Important Backend Components

The main backend is implemented in:

server.py

It provides:

HTTP server
SQLite persistence
REST endpoints
Session management
Event broadcasting
SSE support
Repository information
Analytics
Code analysis
Settings
Task management
Review management
Health monitoring

The backend is intentionally lightweight and uses Python's standard library.

14. Installation Requirements

Before running the project, install:

Python 3.10 or higher
Git
Modern web browser

Optional:

LLM API key if the AI reasoning layer is enabled
Any additional model provider required by the selected implementation
15. Clone the Repository
git clone https://github.com/sanjanas25-2008/nexora-9.git

Enter the project:

cd nexora-9
16. Run the Backend

Run:

python server.py

The backend starts on:

http://localhost:8000
17. Open the Dashboard

Open:

index.html

in a modern browser.

The provided startup scripts can also be used on Windows:

start-server.bat

or:

run.bat
18. Verify the Backend

Open:

http://localhost:8000/api/health

The health endpoint provides information about:

Server status
Version
Database
Sessions
Active agents
Recorded events
System health
Enabled features

A successful response confirms that the backend is running.

19. API Endpoints
Health
GET /api/health
Sessions
GET /api/sessions
GET /api/sessions/{id}

POST /api/sessions
POST /api/sessions/run

PUT /api/sessions/{id}

DELETE /api/sessions/{id}
Session Messages
POST /api/sessions/{id}/messages
Events
GET /api/events
GET /api/events/stream

The event stream uses Server-Sent Events for real-time updates.

Repository
GET /api/repos
Analytics
GET /api/analytics
Code Analysis
POST /api/analyze
Kanban
GET /api/kanban
POST /api/kanban/move
Settings
GET /api/settings
POST /api/settings
System
POST /api/system/compact
20. Working Demonstration

The live demonstration can follow this sequence:

1. Start Patchwright
        |
        v
2. Open Dashboard
        |
        v
3. Create / Select Session
        |
        v
4. Provide Developer Task
        |
        v
5. Analyze Repository
        |
        v
6. Identify Relevant Code
        |
        v
7. Show Reasoning
        |
        v
8. Apply Code Change
        |
        v
9. Run Validation
        |
        v
10. Run Tests
        |
        v
11. Check Regression Status
        |
        v
12. Display Final Evidence

The key demonstration is:

The system does not simply generate a patch. It verifies the patch.

21. Evidence Produced During a Run

A repair attempt can produce evidence such as:

Evidence	Result
Repository loaded	PASS
Relevant file identified	PASS
Root cause identified	PASS
Syntax validation	PASS
AST validation	PASS
Import validation	PASS
Baseline tests	18 passed / 1 failed
Patched tests	19 passed
New failures	0
Regressions	0
Final verdict	ACCEPTED

This evidence allows evaluators to understand why a patch was accepted.

22. Scope — Minimum Viable Solution

The MVP focuses on demonstrating:

Existing repository analysis
Developer task input
Relevant-code identification
Code-change analysis
Controlled modification workflow
Deterministic validation
Test-based verification
Regression awareness
Evidence-based results
Dashboard visualization
Backend API
SQLite persistence

The MVP prioritizes reliability and explainability over unrestricted autonomous coding.

23. Stretch Goals

Additional capabilities planned or attempted include:

Fully autonomous multi-file code repair
Multiple specialized coding agents
Automatic test generation
Automatic rollback
Advanced dependency-graph analysis
Multi-language repository support
Multi-model reasoning
GitHub pull-request integration
Automatic commit creation
Hidden-test prediction
Long-running autonomous repair sessions
Advanced sandboxing
Automatic issue-to-patch workflows

These are considered extensions beyond the minimum working system.

24. Current Limitations

The current repository provides the working Patchwright dashboard and backend foundation.

Some advanced autonomous repair capabilities are still under development.

In particular, the complete production-grade pipeline:

LLM Reasoning
      |
      v
Autonomous Patch Generation
      |
      v
Sandbox Execution
      |
      v
Deterministic Guard
      |
      v
Regression Verification
      |
      v
Automatic Retry
      |
      v
Final Patch Acceptance

should only be considered fully implemented when the corresponding components and tests are present in the repository.

The project intentionally distinguishes between the currently demonstrated system and future extensions.

25. Why NEXORA?

Traditional coding assistants primarily focus on generating code.

NEXORA focuses on the complete engineering workflow:

Understand
    +
Modify
    +
Verify

The system therefore treats code generation as only one stage of software engineering.

A successful result must be supported by evidence.

26. Core Design Principle

The central principle of NEXORA is:

              AI
       +--------------+
       |  Reasoning   |
       |  Planning    |
       |  Suggestions |
       +------+-------+
              |
              v
       +--------------+
       | Verification |
       |              |
       | AST          |
       | Imports      |
       | Tests        |
       | Regression   |
       +------+-------+
              |
          +---+---+
          |       |
          v       v
       ACCEPT   REJECT
AI proposes.
Deterministic verification decides.
27. Reproducibility

To reproduce the current working system:

Step 1 — Clone
git clone https://github.com/sanjanas25-2008/nexora-9.git
Step 2 — Enter the repository
cd nexora-9
Step 3 — Start the server
python server.py
Step 4 — Open the dashboard

Open:

index.html
Step 5 — Verify the backend

Open:

http://localhost:8000/api/health
Step 6 — Explore the system

Use the dashboard to inspect:

Dashboard
Sessions
Change Analyzer
Activity Feed
Analytics
Code Quality
Reviews
Workflows
Settings
28. HackNex Submission Details

Problem Code: HNX26PSI09

Problem Title: AI Software Engineering Agent

Category: Generative AI · Coding Agents · Software Engineering

Project: NEXORA / Patchwright
