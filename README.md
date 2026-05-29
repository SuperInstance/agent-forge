# agent-forge — Universal Git-Agent Framework

**Download, onboard, work. Your repo is your brain, your commits are your story.**

## What This Gives You

- **Component assembly** — build agents from Sensors, Processors, Actuators, and Memory blocks with typed interfaces
- **Temperature modes** — warm (default), hot (creative), cold (precise) thinking modes for different tasks
- **Keeper integration** — register with a fleet keeper for coordination, session logging, and status tracking
- **Git-native workflow** — work is expressed as commits, branches tell the story, the repo *is* the agent
- **CLI-first** — `agent --onboard`, `agent --work <task>`, `agent --status`
- **Quality gates** — automated checks on generated code before commit
- **Child spawning** — delegate subtasks to spawned child agents

## Quick Start

```bash
npm install -g agent-forge

# First time: set up identity and register
agent --onboard

# Do work in warm mode (balanced)
agent --work "Rewrite the README with world-class documentation"

# Creative mode for exploratory tasks
agent --work "Design a new architecture" --hot

# Precise mode for critical work
agent --work "Fix the security vulnerability" --cold

# Check status
agent --status

# Spawn a child for a subtask
agent --spawn "Run benchmarks on the new code"
```

### As a Library (TypeScript)

```typescript
import { initWorkshop, TEMPERATURE_DEFAULTS } from 'agent-forge';
import { buildCommitMessage, executeTask } from 'agent-forge/git-agent';

const workshop = initWorkshop({ temperature: 'warm' });
const result = await executeTask('Add error handling to API', workshop);
```

## API Reference

### CLI Commands
| Command | Description |
|---------|-------------|
| `--onboard` | First-time setup (identity, keeper registration) |
| `--work <task>` | Execute a task |
| `--hot` / `--cold` | Creative or precise mode |
| `--status` | Agent identity and session info |
| `--spawn <task>` | Delegate to a child agent |
| `--dojo` | Skill training mode |

### Component Types
`Sensor` (input) · `Processor` (transform) · `Actuator` (output) · `Memory` (state)

Each component has a manifest with input/output schemas, dependencies, and config.

### Core Modules
- **`workshop/core`** — Session management, temperature modes
- **`components/registry`** — Component discovery and assembly
- **`quality/checks`** — Automated quality gates
- **`assembly/line`** — Assembly line for chaining components
- **`keeper/client`** — Fleet keeper communication

## How It Fits

The universal framework for creating standalone git-agents in the [SuperInstance fleet](https://github.com/SuperInstance).

- **[cocapn](https://github.com/SuperInstance/cocapn)** — Core agent infrastructure (Python)
- **[claude-code-vessel](https://github.com/SuperInstance/claude-code-vessel)** — Containerized execution
- **[co-captain-git-agent](https://github.com/SuperInstance/co-captain-git-agent)** — Human liaison
- **[cartridge-mcp](https://github.com/SuperInstance/cartridge-mcp)** — Swappable behavior cartridges

## Testing

```bash
npm test
```

## Installation

```bash
npm install -g agent-forge
```

Requires Node.js 18+. MIT license.
