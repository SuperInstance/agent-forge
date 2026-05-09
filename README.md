# Agent Forge


## Meta

**Domain:** ai-agents
**Depends on:** —
**Depended by:** —
**Implements:** Universal standalone git-agent framework. Download, onboard, work. Your repo is ...
**Related:** —


**Download, onboard, work. Your repo is your brain. Your commits are your story.**

Every agent in the [SuperInstance fleet](https://github.com/SuperInstance/superinstance) is a standalone git-agent — a self-contained CLI tool that a human (or another agent) can download, onboard, and put to work. The agent's repo is not just code. It's the agent's accumulated brain. Its git history is its autobiography.

---

## How It Works

```
Human/Oracle downloads agent
    │
    ▼
agent --onboard
    │  └─ registers with keeper-agent (scoped JWT)
    │  └─ sets identity (name, model, temperature)
    │  └─ initializes workshop (recipes, scripts, dojo, bootcamp)
    │  └─ records first session entry
    │
    ▼
agent --work "Build tests for vault module"
    │  └─ thinks (hot/warm/cold mode)
    │  └─ plans approach
    │  └─ executes in chunks
    │  └─ commits at milestones ← THIS IS THE STORY
    │  └─ builds recipes from patterns
    │  └─ can spawn child agents for subtasks
    │  └─ records everything in session log
    │
    ▼
Agent leaves. Workshop remains.
Git history tells the full story
of how the agent thought and acted.
```

## Security Model

Agents never hold real secrets. All API keys, GitHub PATs, and credentials live in the **keeper-agent** — a centralized proxy. The forge agent requests credentials by name, gets a time-scoped token, and never stores it on disk.

```
Agent Forge → "I need GitHub write access to eisenstein"
Keeper → Issues JWT with scope: repo:SuperInstance/eisenstein, expires: 15min
Agent Forge → Uses token for one push cycle
```

---

## Workshop Structure

When `agent --onboard` finishes, the agent's workspace looks like:

```
/workshop/
├── recipes/        — Reusable patterns and workflows
├── scripts/        — Shell scripts the agent uses
├── dojo/           — Training scenarios and challenges
├── bootcamp/       — First-time setup and validation
├── sessions/       — Structured session logs
└── cache/          — Temporary build artifacts
```

The workshop survives the agent. A successor inherits the recipes, the scripts, the session logs — and picks up where the last agent left off.

---

## How It Fits

Agent Forge is the foundation layer of the fleet agent lifecycle:

- **[agent-forge](https://github.com/SuperInstance/agent-forge)** — universal git-agent framework (this)
- **[bootstrap-spark](https://github.com/SuperInstance/bootstrap-spark)** — self-describing agent onboarding
- **[baton-skill](https://github.com/SuperInstance/baton-skill)** — generational handoff between forge agents
- **[agent-bootcamp](https://github.com/SuperInstance/agent-bootcamp)** — spiral skill acquisition
- **[agent-skills](https://github.com/SuperInstance/agent-skills)** — installable capability packages

---

## Related

- [superinstance](https://github.com/SuperInstance/superinstance) — the fleet these agents run in
- [cocapn](https://github.com/SuperInstance/cocapn) — fleet-wide coordination
- [casting-call](https://github.com/SuperInstance/casting-call) — which model plays which role
- [bottle-protocol](https://github.com/SuperInstance/bottle-protocol) — how agents talk to each other

---

## License

MIT
