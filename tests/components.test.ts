import { describe, it, expect } from 'vitest';
import {
  createManifest,
  instantiate,
  validateDependencies,
  groupByKind,
  versionSatisfies,
  type ComponentKind,
} from '../src/components/registry.js';

// ─── Component Tests ──────────────────────────────────────────

describe('Component Manifest', () => {
  it('should create a valid manifest with defaults', () => {
    const m = createManifest({ name: 'web-sensor', kind: 'sensor' });
    expect(m.name).toBe('web-sensor');
    expect(m.kind).toBe('sensor');
    expect(m.version).toBe('1.0.0');
    expect(m.dependencies).toEqual([]);
    expect(m.required).toBe(false);
    expect(m.tags).toEqual([]);
  });

  it('should create a manifest with all options', () => {
    const m = createManifest({
      name: 'llm-brain',
      kind: 'processor',
      version: '2.1.0',
      description: 'LLM reasoning engine',
      inputSchema: { type: 'string' },
      outputSchema: { type: 'object' },
      dependencies: ['web-sensor'],
      defaultConfig: { model: 'gpt-4o', temperature: 0.7 },
      required: true,
      tags: ['ai', 'core'],
    });

    expect(m.version).toBe('2.1.0');
    expect(m.description).toBe('LLM reasoning engine');
    expect(m.dependencies).toEqual(['web-sensor']);
    expect(m.required).toBe(true);
    expect(m.tags).toEqual(['ai', 'core']);
  });

  it('should reject invalid component names', () => {
    expect(() => createManifest({ name: '', kind: 'sensor' })).toThrow();
    expect(() => createManifest({ name: 'MyComponent', kind: 'sensor' })).toThrow();
    expect(() => createManifest({ name: '123abc', kind: 'sensor' })).toThrow();
    expect(() => createManifest({ name: 'has space', kind: 'sensor' })).toThrow();
  });

  it('should accept names with dashes and numbers', () => {
    const m = createManifest({ name: 'web-hook-v2', kind: 'actuator' });
    expect(m.name).toBe('web-hook-v2');
  });

  it('should instantiate a component with default config', () => {
    const m = createManifest({
      name: 'git-commit',
      kind: 'actuator',
      defaultConfig: { autoPush: false },
    });

    const inst = instantiate(m);
    expect(inst.config).toEqual({ autoPush: false });
    expect(inst.enabled).toBe(true);
    expect(inst.invokeCount).toBe(0);
    expect(inst.addedAt).toBeTruthy();
  });

  it('should merge config overrides on instantiation', () => {
    const m = createManifest({
      name: 'cache',
      kind: 'memory',
      defaultConfig: { ttl: 300, maxSize: 100 },
    });

    const inst = instantiate(m, { ttl: 600 });
    expect(inst.config).toEqual({ ttl: 600, maxSize: 100 });
  });
});

describe('Dependency Validation', () => {
  it('should return empty for self-contained components', () => {
    const components = [
      createManifest({ name: 'a', kind: 'sensor' }),
      createManifest({ name: 'b', kind: 'actuator' }),
    ];

    expect(validateDependencies(components)).toEqual([]);
  });

  it('should detect missing dependencies', () => {
    const components = [
      createManifest({ name: 'brain', kind: 'processor', dependencies: ['eyes', 'ears'] }),
      createManifest({ name: 'eyes', kind: 'sensor' }),
    ];

    const missing = validateDependencies(components);
    expect(missing).toEqual(['brain → ears']);
  });

  it('should handle circular dependencies gracefully', () => {
    const components = [
      createManifest({ name: 'a', kind: 'processor', dependencies: ['b'] }),
      createManifest({ name: 'b', kind: 'processor', dependencies: ['a'] }),
    ];

    // Both present — no missing deps
    expect(validateDependencies(components)).toEqual([]);
  });
});

describe('Group By Kind', () => {
  it('should separate components by kind', () => {
    const components = [
      createManifest({ name: 'http', kind: 'sensor' }),
      createManifest({ name: 'webhook', kind: 'sensor' }),
      createManifest({ name: 'brain', kind: 'processor' }),
      createManifest({ name: 'git', kind: 'actuator' }),
      createManifest({ name: 'cache', kind: 'memory' }),
    ];

    const groups = groupByKind(components);
    expect(groups.sensor).toHaveLength(2);
    expect(groups.processor).toHaveLength(1);
    expect(groups.actuator).toHaveLength(1);
    expect(groups.memory).toHaveLength(1);
  });

  it('should return empty arrays for missing kinds', () => {
    const groups = groupByKind([
      createManifest({ name: 'http', kind: 'sensor' }),
    ]);

    expect(groups.processor).toEqual([]);
    expect(groups.actuator).toEqual([]);
    expect(groups.memory).toEqual([]);
  });
});

describe('Version Comparison', () => {
  it('should satisfy equal versions', () => {
    expect(versionSatisfies('1.0.0', '1.0.0')).toBe(true);
  });

  it('should satisfy higher versions', () => {
    expect(versionSatisfies('2.0.0', '1.0.0')).toBe(true);
    expect(versionSatisfies('1.1.0', '1.0.0')).toBe(true);
    expect(versionSatisfies('1.0.1', '1.0.0')).toBe(true);
  });

  it('should not satisfy lower versions', () => {
    expect(versionSatisfies('0.9.0', '1.0.0')).toBe(false);
    expect(versionSatisfies('1.0.0', '1.1.0')).toBe(false);
  });
});
