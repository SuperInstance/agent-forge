# Agent Forge

**Universal standalone git-agent. The repository is the brain.**

![Status](https://img.shields.io/badge/Status-Functional-brightgreen)
![Python](https://img.shields.io/badge/Python-3.10+-blue)

Forge downloads an agent, onboards it to a target repository, and assigns work. The repo itself carries all agent memory via `.forge_manifest.json` — no external database, no Redis, no stateful server. Destroy the agent, the knowledge survives.

---

## Key Features

- **Repo-as-Brain Architecture** — All agent context lives in `.forge_manifest.json` at the repo root; clone the repo and the agent resumes where it left off
- **Agent Download + Onboard** — Single call to `download_agent()` clones a repo and initializes the manifest with auto-detected capabilities
- **Task Assignment via Filesystem** — `assign_task()` writes directly to the repo manifest; any tool (git, CI, another agent) can read it
- **Auto-Capability Detection** — Scans the cloned repo for `src/`, `tests/`, `docs/`, `.github/` to set agent capabilities automatically
- **Stateless by Design** — The `Forge` class holds no persistent state; all continuity is in the repo

---

## How It Works: Repo as Brain

Traditional agents need a database to store their memory. Forge agents store memory in the repo itself:

```
my-project/
├── .forge_manifest.json   ← agent's brain lives here
├── src/
├── tests/
└── docs/
```

The manifest tracks: agent_id, current_task, task_history, installed timestamp, and detected capabilities. Any Forge instance can pick up where a previous one left off by cloning and reading.

---

## Usage

### Download and Onboard an Agent

```python
from forge import Forge

forge = Forge()
ctx = forge.download_agent(
    agent_id="forge-001",
    repo_url="https://github.com/SuperInstance/pilot.git",
    work_dir="/tmp/forge-pilot"
)
```

### Assign Work

```python
result = forge.assign_task("forge-001", "Scan repo for TODOs and report")
# {'agent_id': 'forge-001', 'task': 'Scan repo for TODOs and report', 'status': 'assigned'}
```

### Check Status

```python
status = forge.report_status("forge-001")
# Reads .forge_manifest.json from the repo, returns full manifest
print(status["current_task"], status["task_history"])
```

### End-to-End CLI Demo

```bash
python src/forge.py
```

Output:
```
[Forge] Agent forge-001 onboarded to https://github.com/SuperInstance/pilot.git
[Forge] Agent forge-002 onboarded to https://github.com/SuperInstance/navigator.git
{'agent_id': 'forge-001', 'task': 'Scan repo for TODOs', 'status': 'assigned'}
{'agent_id': 'forge-002', 'task': 'Write integration test', 'status': 'assigned'}
{
  "agent_id": "forge-001",
  "repo_url": "https://github.com/SuperInstance/pilot.git",
  "installed": true,
  "capabilities": ["code", "testing", "ci"],
  "current_task": "Scan repo for TODOs",
  "task_history": [{"task": "Scan repo for TODOs", "status": "in_progress"}]
}
```

---

## Architecture

```
src/
└── forge.py
    ├── AgentContext (dataclass)
    │   ├── repo_url: str
    │   ├── work_dir: Path
    │   ├── repo_data: dict           # in-memory snapshot
    │   └── current_task: str
    │
    └── Forge
        ├── agents: dict[str, AgentContext]
        ├── download_agent()         # git clone + manifest init
        ├── assign_task()            # write to .forge_manifest.json
        ├── report_status()          # read from .forge_manifest.json
        └── _detect_capabilities()   # scan repo structure
```

### The Manifest File

`.forge_manifest.json` is the single source of truth:

```json
{
  "agent_id": "forge-001",
  "repo_url": "https://github.com/SuperInstance/pilot.git",
  "installed": true,
  "capabilities": ["code", "testing", "ci"],
  "current_task": "Scan repo for TODOs",
  "task_history": [
    {"task": "Scan repo for TODOs", "status": "in_progress"}
  ]
}
```

---

## Related Repos

- [fleet-agent](https://github.com/SuperInstance/fleet-agent) — Fleet orchestration for running Forge agents at scale
- [superinstance](https://github.com/SuperInstance/superinstance) — Agent collective framework
- [agent-lifecycle-registry](https://github.com/SuperInstance/Agent-Lifecycle-Registry) — Track agent states from registration through termination
- [agent-bootcamp](https://github.com/SuperInstance/agent-bootcamp) — Train agents with spiral-difficulty challenges
