/**
 * AssemblyLine — Multi-stage agent construction pipeline.
 *
 * Agents aren't built in one shot. They go through stages:
 *   1. Schematic  — Load and validate the blueprint
 *   2. Foundation — Set up identity and keeper connection
 *   3. Workshop   — Initialize the workspace structure
 *   4. Equip      — Install components (sensors, processors, actuators)
 *   5. Calibrate  — Run quality checks, validate configuration
 *   6. Activate   — Record session, mark as ready
 *
 * Each stage produces a partial agent. The assembly line tracks progress
 * and can resume from any failed stage.
 */

import type { AgentIdentity } from '../cli/identity.js';
import type { Temperature } from '../workshop/core.js';

export type AssemblyStage =
  | 'schematic'
  | 'foundation'
  | 'workshop'
  | 'equip'
  | 'calibrate'
  | 'activate';

export const ASSEMBLY_STAGES: AssemblyStage[] = [
  'schematic',
  'foundation',
  'workshop',
  'equip',
  'calibrate',
  'activate',
];

export interface AssemblyResult {
  success: boolean;
  agentId: string;
  completedStages: AssemblyStage[];
  failedStage?: AssemblyStage;
  error?: string;
  durationMs: number;
}

export interface PartialAgent {
  id: string;
  identity?: AgentIdentity;
  stages: AssemblyStage[];
  currentStage: AssemblyStage;
  createdAt: string;
}

/**
 * Create a fresh partial agent at the start of assembly.
 */
export function createPartialAgent(id: string): PartialAgent {
  return {
    id,
    stages: [],
    currentStage: 'schematic',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Advance a partial agent to the next stage.
 */
export function advanceStage(agent: PartialAgent, stage: AssemblyStage): PartialAgent {
  const expectedIndex = agent.stages.length;
  const stageIndex = ASSEMBLY_STAGES.indexOf(stage);

  if (stageIndex !== expectedIndex) {
    throw new Error(
      `Stage out of order: expected ${ASSEMBLY_STAGES[expectedIndex]}, got ${stage}`
    );
  }

  return {
    ...agent,
    stages: [...agent.stages, stage],
    currentStage: ASSEMBLY_STAGES[Math.min(stageIndex + 1, ASSEMBLY_STAGES.length - 1)],
  };
}

/**
 * Get the next stage that needs to be completed.
 */
export function nextStage(agent: PartialAgent): AssemblyStage | null {
  const idx = agent.stages.length;
  if (idx >= ASSEMBLY_STAGES.length) return null;
  return ASSEMBLY_STAGES[idx];
}

/**
 * Check if assembly is complete.
 */
export function isComplete(agent: PartialAgent): boolean {
  return agent.stages.length === ASSEMBLY_STAGES.length;
}

/**
 * Get progress as a fraction (0.0 to 1.0).
 */
export function progress(agent: PartialAgent): number {
  return agent.stages.length / ASSEMBLY_STAGES.length;
}

/**
 * Run the full assembly line with stage handlers.
 *
 * Each handler receives the partial agent and must return true on success.
 * On failure, assembly stops and the result includes the failed stage.
 */
export async function assemble(
  agentId: string,
  handlers: Record<AssemblyStage, (agent: PartialAgent) => Promise<boolean>>
): Promise<AssemblyResult> {
  const startTime = Date.now();
  let agent = createPartialAgent(agentId);

  for (const stage of ASSEMBLY_STAGES) {
    try {
      const ok = await handlers[stage](agent);
      if (!ok) {
        return {
          success: false,
          agentId,
          completedStages: agent.stages,
          failedStage: stage,
          error: `Stage "${stage}" returned false`,
          durationMs: Date.now() - startTime,
        };
      }
      agent = advanceStage(agent, stage);
    } catch (err) {
      return {
        success: false,
        agentId,
        completedStages: agent.stages,
        failedStage: stage,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
      };
    }
  }

  return {
    success: true,
    agentId,
    completedStages: agent.stages,
    durationMs: Date.now() - startTime,
  };
}
