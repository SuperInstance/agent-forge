# agent-forge

Universal standalone git-agent. The repository is the brain.

## Concept

Forge downloads an agent, onboards it to a target repo, and assigns work. The repo itself stores agent context — no external database needed.

## Usage

```bash
python src/forge.py
```

## Key Features

1. **download_agent()** — Clone repo and initialize manifest
2. **assign_task()** — Write task to repo manifest (repo is brain)
3. **report_status()** — Read agent status from repo manifest

## Architecture

```
Forge
├── agents{} — active agent contexts
├── download_agent() — clone + onboard
├── assign_task() — write task to repo
└── report_status() — read from repo manifest
```

The `.forge_manifest.json` file in the repo carries all agent memory. Destroying the agent doesn't destroy the knowledge — it's in the repo.