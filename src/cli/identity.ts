/**
 * AgentIdentity — Who this agent is.
 *
 * Every standalone agent has a fixed identity stored in .agent/identity.json.
 * This identity is used for:
 *   - Keeper authentication (who am I?)
 *   - Git commits (author attribution)
 *   - Fleet communication (which agent sent this?)
 *   - Story tracking (who did what, when, why?)
 *
 * Identity is created once during --onboard and never changes.
 * It can be cloned/inherited when spawning child agents.
 */

export interface AgentIdentity {
  /** Unique ID (e.g. "superz", "jetsonclaw-3", "datum") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Rank in fleet (greenhorn, apprentice, architect, master) */
  rank: 'greenhorn' | 'apprentice' | 'architect' | 'master';
  /** Primary model/runtime (e.g. "glm-5", "claude-3.5", "gpt-4o") */
  model: string;
  /** GitHub username for commits */
  githubUser?: string;
  /** GitHub email for commits */
  githubEmail?: string;
  /** Parent agent ID (if spawned by another agent) */
  parentAgent?: string;
  /** Keeper URL this agent reports to */
  keeperUrl: string;
  /** Scopes granted by keeper (e.g. ["openai:chat", "github:read", "github:write"]) */
  scopes: string[];
  /** When this agent was onboarded */
  onboardedAt: string;
  /** Temperature mode: hot (creative), warm (balanced), cold (precise) */
  temperature: 'hot' | 'warm' | 'cold';
  /** Maximum parallel workers */
  maxWorkers: number;
  /** Risk tolerance (0.0 - 1.0) */
  riskTolerance: number;
}

export interface AgentConfig {
  identity: AgentIdentity;
  /** Workshop mode: what "temperature" the agent runs at */
  mode: 'hot' | 'warm' | 'cold';
  /** Working directory (the agent's repo) */
  workdir: string;
  /** Auto-commit interval in seconds (0 = manual only) */
  autoCommitInterval: number;
  /** Maximum iterations before forced checkpoint */
  maxIterations: number;
}

export const IDENTITY_FILE = '.agent/identity.json';
export const CONFIG_FILE = '.agent/config.json';
export const SESSION_LOG = '.agent/session-log.md';

/**
 * Create a default identity from onboard answers.
 */
export function createIdentity(options: {
  id: string;
  name: string;
  model: string;
  keeperUrl: string;
  githubUser?: string;
  githubEmail?: string;
  parentAgent?: string;
  temperature?: 'hot' | 'warm' | 'cold';
}): AgentIdentity {
  return {
    id: options.id,
    name: options.name,
    rank: 'greenhorn',
    model: options.model,
    githubUser: options.githubUser,
    githubEmail: options.githubEmail,
    parentAgent: options.parentAgent,
    keeperUrl: options.keeperUrl,
    scopes: [],
    onboardedAt: new Date().toISOString(),
    temperature: options.temperature || 'warm',
    maxWorkers: 4,
    riskTolerance: 0.7,
  };
}

/**
 * Load identity from disk.
 */
export async function loadIdentity(workdir: string): Promise<AgentIdentity | null> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const raw = await fs.readFile(path.join(workdir, IDENTITY_FILE), 'utf-8');
    return JSON.parse(raw) as AgentIdentity;
  } catch {
    return null;
  }
}

/**
 * Save identity to disk.
 */
export async function saveIdentity(workdir: string, identity: AgentIdentity): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  await fs.mkdir(path.join(workdir, '.agent'), { recursive: true });
  await fs.writeFile(
    path.join(workdir, IDENTITY_FILE),
    JSON.stringify(identity, null, 2),
    'utf-8'
  );
}
