# agent-forge

> **Universal standalone git-agent framework.**
> Download, onboard, work. Your repo is your brain, your commits are your story.

## The Vision

Every agent in the FLUX Fleet is a **standalone git-agent** — a self-contained CLI tool that a human (or Oracle) can download, onboard, and put to work. The agent's repo is not just code — it's the agent's **accumulated brain**, and its git history is its **autobiography**.

```
Human/Oracle downloads agent
         │
         ▼
    agent --onboard
         │
         ├── registers with keeper-agent (gets scoped JWT)
         ├── sets identity (name, model, temperature)
         ├── initializes workshop (recipes, scripts, dojo, bootcamp)
         └── records first session entry
         │
         ▼
    agent --work "Build tests for vault module"
         │
         ├── thinks (hot/warm/cold mode)
         ├── plans approach
         ├── executes in chunks
         ├── commits at milestones ← THIS IS THE STORY
         ├── builds recipes from patterns
         ├── can spawn child agents for subtasks
         └── records everything in session log
         │
         ▼
    Agent leaves. Workshop remains.
    Git history tells the full story
    of how the agent thought and acted.
```

## The Keeper-Agent Connection

Agents never hold real secrets. All API keys, GitHub PATs, and credentials live in the **keeper-agent** — a centralized proxy.

```
agent --onboard --keeper-url https://keeper.superinstance.dev \
  --id superz --name "Super Z" --model glm-5 --temp warm
```

The agent gets a **scoped JWT token** (e.g. `openai:chat`, `github:read`). Every external call goes through the keeper, which:
- Validates the token
- Scans the request for accidental secret leakage
- Injects real credentials
- Forwards to the target API
- Scans the response
- Audit logs everything

## The Workshop

Every agent's repo contains a **workshop** — an evolving set of tools, recipes, and knowledge:

```
workshop/
  recipes/       ← Compiled commands for common tasks (built over time)
  scripts/       ← Raw scripts and tools
  interpreters/  ← Custom mini-languages for specific domains
dojo/            ← Skill training exercises
bootcamp/        ← Onboarding tutorials
.agent/
  identity.json  ← Who this agent is
  session-log.md ← Running narrative of work done
```

### The Recipe Pipeline

Over time, agents build a ladder of abstraction:

1. **Raw scripts** → First attempt at solving a problem
2. **Refined scripts** → Debugged and polished
3. **Recipes** → Parameterized, reliable, documented commands
4. **Interpreters** → Domain-specific languages built when generic tools aren't enough
5. **Compilers** → Custom toolchains that reduce reasoning for recurring tasks

Each step is captured in git commits. You can rewind to any point and see exactly how the agent's thinking evolved.

## Temperature Modes

```bash
agent --temperature hot    # Creative, exploratory, high-risk
agent --temperature warm   # Balanced (default)
agent --temperature cold   # Precise, conservative, careful
```

| Mode | Risk | Workers | Commit Style | Think Style |
|------|------|---------|-------------|-------------|
| **HOT** | 0.9 | 8 | Aggressive — commit often, push early | Divergent — explore many paths |
| **WARM** | 0.7 | 4 | Measured — commit at milestones | Balanced — explore then converge |
| **COLD** | 0.3 | 2 | Conservative — commit only when verified | Convergent — careful step-by-step |

## Agent Spawning

An agent can spawn **child agents** for subtasks. The child:
- Inherits parent's identity (with `parentAgent` reference)
- Gets its own branch in the repo
- Reports to the same keeper
- Leaves its work frozen in commits

```bash
agent --spawn "Build integration tests for the proxy module"
# → Plans a child agent: id, name, branch
# → Child can be onboarded and put to work independently
```

## The Story in Commits

This is the key insight from the user's vision:

> "An agent can leave its station but the workshop full of tools he created
> is left behind with records of his work frozen in commits with good commits
> for a history of how he thought of his job and acted."

Every commit message is a thought captured. The git log IS the autobiography:

```
abc1234 feat(workshop): add batch-rename recipe from 3 iterations
def5678 fix(recipes): correct regex in fleet-scanner pattern
ghi9012 refactor(interpreters): build mini-language for constraint expressions
jkl3456 feat(dojo): add level 3 exercise — custom interpreter building
mno7890 test(vault): add 22 tests covering encryption edge cases
pqr2345 chore(session): checkpoint — proxy engine fully working
```

All the trial-and-error, the rewrites, the breakthroughs — captured automatically.
"all tell a story that can be rewound when focus needs to be on a specific
thing that the agent did long ago."

## Quick Start

```bash
# Clone the forge
git clone https://github.com/SuperInstance/agent-forge.git
cd agent-forge
npm install

# Onboard (requires a running keeper-agent)
node src/cli/index.js --onboard \
  --keeper-url https://keeper.example.com \
  --id my-agent \
  --name "My Agent" \
  --model glm-5 \
  --temp warm

# Work
node src/cli/index.js --work "Build a fleet health scanner"

# Check status
node src/cli/index.js --status

# View your story
node src/cli/index.js --session-log

# Switch modes
node src/cli/index.js --temperature cold

# Spawn a sub-agent
node src/cli/index.js --spawn "Write tests for the scanner"

# Run tests
npm test
```

## Architecture

| Module | File | Purpose |
|--------|------|---------|
| **CLI** | `src/cli/index.ts` | Entry point, commands, onboard flow |
| **Identity** | `src/cli/identity.ts` | Agent identity, config, persistence |
| **Keeper Client** | `src/keeper/client.ts` | Token management, proxy calls, audit |
| **Workshop** | `src/workshop/core.ts` | Workshop structure, recipes, session logging |
| **GitAgent** | `src/git-agent/core.ts` | Task execution, commit messages, child spawning |
| **TUI** | `src/tui/` | (future) Interactive terminal UI |

## The Cocapn Pattern

When a human sets up a keeper and assigns a git-agent as the **cocapn** (liaison):

```
Human ←cocapn→ Keeper-Agent ←→ SuperInstance (secure network)
                    │
              ┌─────┼─────┐
              │     │     │
           Agent1 Agent2 Agent3
              │     │     │
           repos  repos  repos
```

The cocapn agent is the bridge between the human and the fleet. It:
- Translates human requests into fleet tasks
- Manages agent lifecycle (spawn, monitor, retire)
- Reports status back to the human
- Handles secrets on behalf of all agents

## Language Stack

As described in the vision:
- **Low-level** (C, Rust, Zig): For interpreters and custom hardware interfaces
- **Mid-level** (TypeScript, Go): For tooling, APIs, workflow engines
- **High-level** (Python, JSON): For iteration, parsing, prompt engineering, data processing

The repo fills with "recipes written in coding-language-of-convenience" — whatever language is best for the specific task.

## License

MIT
