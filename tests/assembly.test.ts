import { describe, it, expect } from 'vitest';
import {
  createPartialAgent,
  advanceStage,
  nextStage,
  isComplete,
  progress,
  assemble,
  ASSEMBLY_STAGES,
  type AssemblyStage,
} from '../src/assembly/line.js';

// ─── AssemblyLine Tests ───────────────────────────────────────

describe('AssemblyLine', () => {
  it('should list all six stages in order', () => {
    expect(ASSEMBLY_STAGES).toEqual([
      'schematic',
      'foundation',
      'workshop',
      'equip',
      'calibrate',
      'activate',
    ]);
  });

  it('should create a partial agent with no completed stages', () => {
    const agent = createPartialAgent('test-1');
    expect(agent.id).toBe('test-1');
    expect(agent.stages).toEqual([]);
    expect(agent.currentStage).toBe('schematic');
    expect(agent.createdAt).toBeTruthy();
  });

  it('should advance stages in order', () => {
    let agent = createPartialAgent('test-2');
    agent = advanceStage(agent, 'schematic');
    expect(agent.stages).toEqual(['schematic']);
    agent = advanceStage(agent, 'foundation');
    expect(agent.stages).toEqual(['schematic', 'foundation']);
  });

  it('should reject out-of-order stage advancement', () => {
    const agent = createPartialAgent('test-3');
    expect(() => advanceStage(agent, 'workshop')).toThrow('Stage out of order');
  });

  it('should report next stage correctly', () => {
    const agent = createPartialAgent('test-4');
    expect(nextStage(agent)).toBe('schematic');

    const mid = { ...agent, stages: ['schematic', 'foundation'] as AssemblyStage[] };
    expect(nextStage(mid)).toBe('workshop');
  });

  it('should return null nextStage when complete', () => {
    const done = {
      ...createPartialAgent('test-5'),
      stages: [...ASSEMBLY_STAGES] as AssemblyStage[],
    };
    expect(nextStage(done)).toBeNull();
  });

  it('should detect completion', () => {
    const incomplete = createPartialAgent('test-6');
    expect(isComplete(incomplete)).toBe(false);

    const complete = {
      ...incomplete,
      stages: [...ASSEMBLY_STAGES] as AssemblyStage[],
    };
    expect(isComplete(complete)).toBe(true);
  });

  it('should calculate progress fraction', () => {
    const agent = createPartialAgent('test-7');
    expect(progress(agent)).toBe(0);

    const half = { ...agent, stages: ASSEMBLY_STAGES.slice(0, 3) as AssemblyStage[] };
    expect(progress(half)).toBeCloseTo(0.5);

    const full = { ...agent, stages: [...ASSEMBLY_STAGES] as AssemblyStage[] };
    expect(progress(full)).toBe(1);
  });

  it('should run full assembly with all handlers succeeding', async () => {
    const ok = async () => true as const;
    const result = await assemble('full-test', {
      schematic: ok,
      foundation: ok,
      workshop: ok,
      equip: ok,
      calibrate: ok,
      activate: ok,
    });

    expect(result.success).toBe(true);
    expect(result.completedStages).toEqual(ASSEMBLY_STAGES);
    expect(result.failedStage).toBeUndefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should stop assembly on handler failure', async () => {
    const result = await assemble('fail-test', {
      schematic: async () => true,
      foundation: async () => true,
      workshop: async () => false,
      equip: async () => true,
      calibrate: async () => true,
      activate: async () => true,
    });

    expect(result.success).toBe(false);
    expect(result.failedStage).toBe('workshop');
    expect(result.completedStages).toEqual(['schematic', 'foundation']);
    expect(result.error).toContain('returned false');
  });

  it('should catch handler exceptions', async () => {
    const result = await assemble('error-test', {
      schematic: async () => {
        throw new Error('boom');
      },
      foundation: async () => true,
      workshop: async () => true,
      equip: async () => true,
      calibrate: async () => true,
      activate: async () => true,
    });

    expect(result.success).toBe(false);
    expect(result.failedStage).toBe('schematic');
    expect(result.error).toBe('boom');
  });
});
