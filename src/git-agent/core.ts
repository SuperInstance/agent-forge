/**
 * GitAgent — The workhorse that does the actual work and tells the story.
 *
 * Every action a git-agent takes is captured in commits. The git history
 * IS the agent's autobiography. This is the fundamental insight:
 *
 *   "An agent can leave its station but the workshop full of tools
 *    it created is left behind with records of its work frozen in
 *    commits with good commits for a history of how it thought of
 *    its job and acted."
 *
 * The GitAgent:
 *   1. Thinks about a task (hot/warm/cold mode)
 *   2. Plans the approach
 *   3. Executes in small chunks (git commits at each milestone)
 *   4. Tests at each step
 *   5. Commits with narrative messages
 *   6. Can spawn child agents for subtasks
 *   7. Builds recipes from successful patterns
 *   8. Records everything in the session log
 */

import { recordSession } from '../workshop/core.js';
import type { Temperature } from '../workshop/core.js';
import type { AgentIdentity } from '../cli/identity.js';
import type { KeeperClient } from '../keeper/client.js';

export interface GitAgentOptions {
  workdir: string;
  identity: AgentIdentity;
  keeper: KeeperClient;
  temperature: Temperature;
}

export interface TaskPlan {
  description: string;
  steps: string[];
  estimatedCommits: number;
  riskLevel: 'low' | 'medium' | 'high';
  dependencies?: string[];
}

export interface TaskResult {
  success: boolean;
  commits: string[];
  filesCreated: string[];
  filesModified: string[];
  duration: number;
  summary: string;
}

/**
 * Build a good commit message.
 * Commit messages are the "prose" of the git-agent's story.
 */
export function buildCommitMessage(action: string, details?: {
  type?: 'feat' | 'fix' | 'refactor' | 'docs' | 'test' | 'chore';
  scope?: string;
  body?: string;
  breaking?: boolean;
}): string {
  const type = details?.type || 'feat';
  const scope = details?.scope ? `(${details.scope})` : '';
  const breaking = details?.breaking ? '!' : '';
  const body = details?.body ? `\n\n${details.body}` : '';

  return `${type}${scope}${breaking}: ${action}${body}`;
}

/**
 * Get the temperature-appropriate commit style.
 */
export function getCommitStyle(temp: Temperature): string {
  switch (temp) {
    case 'hot':
      return 'Aggressive: commit early, commit often, push immediately. Capture every thought.';
    case 'warm':
      return 'Measured: commit at milestones. Good commit messages that tell the story.';
    case 'cold':
      return 'Conservative: commit only when verified. Every commit must be correct.';
  }
}

/**
 * Get temperature-appropriate thinking style.
 */
export function getThinkStyle(temp: Temperature): string {
  switch (temp) {
    case 'hot':
      return 'Explore rapidly. Try many approaches. Fail fast. Capture what works.';
    case 'warm':
      return 'Plan, then execute. Iterate on the plan. Verify before committing.';
    case 'cold':
      return 'Analyze thoroughly. Plan every step. Verify each step before proceeding.';
  }
}

/**
 * Execute a task as a GitAgent.
 *
 * This is the core loop. In a real implementation, this would use
 * the LLM to think, plan, and execute. For now, it's a framework.
 */
export async function executeTask(
  options: GitAgentOptions,
  task: string,
  executor: (workdir: string, step: string) => Promise<{
    filesChanged: string[];
    output: string;
    success: boolean;
  }>
): Promise<TaskResult> {
  const startTime = Date.now();
  const commits: string[] = [];
  const allFilesCreated: string[] = [];
  const allFilesModified: string[] = [];

  await recordSession(options.workdir, {
    action: `TASK STARTED: ${task}`,
    details: `Temperature: ${options.temperature} | Model: ${options.identity.model} | Rank: ${options.identity.rank}`,
    temperature: options.temperature,
  });

  // In a real agent, here we would:
  // 1. Think about the task (using LLM through keeper proxy)
  // 2. Plan the approach
  // 3. Execute step by step
  // 4. Commit at each milestone
  // 5. Build recipes from successful patterns
  // 6. Record results in session log

  // For now, record the framework is ready
  const duration = Date.now() - startTime;

  await recordSession(options.workdir, {
    action: `TASK COMPLETED: ${task}`,
    details: `Duration: ${duration}ms | Commits: ${commits.length} | Files: ${allFilesCreated.length} created, ${allFilesModified.length} modified`,
    temperature: options.temperature,
  });

  return {
    success: true,
    commits,
    filesCreated: allFilesCreated,
    filesModified: allFilesModified,
    duration,
    summary: `Task "${task}" executed in ${options.temperature} mode. Framework ready for LLM integration.`,
  };
}

/**
 * Spawn a child git-agent for a subtask.
 *
 * The child agent:
 *   - Inherits parent's identity (with parentAgent set)
 *   - Gets its own repo branch
 *   - Reports back via keeper
 *   - Leaves its work in commits
 */
export function planChildSpawn(
  parentIdentity: AgentIdentity,
  taskDescription: string
): { suggestedId: string; suggestedName: string; branchName: string } {
  const timestamp = Date.now().toString(36);
  const taskSlug = taskDescription
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 20);

  return {
    suggestedId: `${parentIdentity.id}-${taskSlug}-${timestamp}`,
    suggestedName: `${parentIdentity.name} [sub: ${taskSlug}]`,
    branchName: `${parentIdentity.id}/${taskSlug}`,
  };
}
