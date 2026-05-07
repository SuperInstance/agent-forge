"""Universal standalone git-agent. Repo is the brain."""
import os
import sys
import json
import subprocess
from pathlib import Path
from dataclasses import dataclass, field

@dataclass
class AgentContext:
    repo_url: str
    work_dir: Path
    repo_data: dict = field(default_factory=dict)
    current_task: str = ""

class Forge:
    """Downloads agent, onboards to repo, begins work. Repo is the brain."""
    
    def __init__(self):
        self.agents: dict[str, AgentContext] = {}
    
    def download_agent(self, agent_id: str, repo_url: str, work_dir: str) -> AgentContext:
        """Fetch agent from registry and set up workspace."""
        ctx = AgentContext(repo_url=repo_url, work_dir=Path(work_dir))
        os.makedirs(work_dir, exist_ok=True)
        
        # Clone the repo (the "brain")
        result = subprocess.run(
            ["git", "clone", "--depth", "1", repo_url, work_dir],
            capture_output=True, text=True
        )
        
        # Initialize repo manifest
        manifest = {
            "agent_id": agent_id,
            "repo_url": repo_url,
            "installed": True,
            "capabilities": self._detect_capabilities(work_dir)
        }
        
        manifest_path = Path(work_dir) / ".forge_manifest.json"
        manifest_path.write_text(json.dumps(manifest, indent=2))
        ctx.repo_data = manifest
        
        self.agents[agent_id] = ctx
        print(f"[Forge] Agent {agent_id} onboarded to {repo_url}")
        return ctx
    
    def assign_task(self, agent_id: str, task: str) -> dict:
        """Assign work to an agent. Repo stores context."""
        if agent_id not in self.agents:
            return {"error": "Agent not found"}
        
        ctx = self.agents[agent_id]
        ctx.current_task = task
        
        # Store task in repo manifest
        manifest = ctx.repo_data
        manifest["current_task"] = task
        manifest["task_history"] = manifest.get("task_history", [])
        manifest["task_history"].append({"task": task, "status": "in_progress"})
        
        manifest_path = ctx.work_dir / ".forge_manifest.json"
        manifest_path.write_text(json.dumps(manifest, indent=2))
        
        return {"agent_id": agent_id, "task": task, "status": "assigned"}
    
    def report_status(self, agent_id: str) -> dict:
        """Check agent status by reading its repo manifest."""
        if agent_id not in self.agents:
            return {"error": "Agent not found"}
        
        ctx = self.agents[agent_id]
        manifest_path = ctx.work_dir / ".forge_manifest.json"
        
        if manifest_path.exists():
            return json.loads(manifest_path.read_text())
        return ctx.repo_data
    
    def _detect_capabilities(self, work_dir: str) -> list[str]:
        """Scan repo for detectable capabilities."""
        capabilities = []
        path = Path(work_dir)
        
        if (path / "src").exists(): capabilities.append("code")
        if (path / "tests").exists(): capabilities.append("testing")
        if (path / "docs").exists(): capabilities.append("docs")
        if (path / ".github").exists(): capabilities.append("ci")
        
        return capabilities if capabilities else ["basic"]

if __name__ == "__main__":
    forge = Forge()
    
    # Simulate onboarding 2 agents
    ctx1 = forge.download_agent("forge-001", "https://github.com/SuperInstance/pilot.git", "/tmp/forge-pilot")
    ctx2 = forge.download_agent("forge-002", "https://github.com/SuperInstance/navigator.git", "/tmp/forge-navigator")
    
    # Assign tasks
    print(forge.assign_task("forge-001", "Scan repo for TODOs"))
    print(forge.assign_task("forge-002", "Write integration test"))
    
    # Check status
    print(json.dumps(forge.report_status("forge-001"), indent=2))