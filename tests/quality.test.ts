import { describe, it, expect } from 'vitest';
import {
  runQualityChecks,
  checkIdentity,
  checkRequiredComponents,
  checkDependencies,
  checkWorkshop,
} from '../src/quality/checks.js';
import { createManifest } from '../src/components/registry.js';
import { createIdentity } from '../src/cli/identity.js';

// ─── Quality Check Tests ──────────────────────────────────────

describe('Quality: Identity Check', () => {
  it('should fail with no identity', () => {
    const result = checkIdentity(undefined);
    expect(result.severity).toBe('error');
    expect(result.message).toContain('No identity');
  });

  it('should pass with valid identity', () => {
    const identity = createIdentity({
      id: 'test-agent',
      name: 'Test',
      keeperUrl: 'https://keeper.example.com',
      model: 'glm-5',
    });

    const result = checkIdentity(identity);
    expect(result.severity).toBe('ok');
    expect(result.message).toContain('test-agent');
  });
});

describe('Quality: Required Components', () => {
  it('should warn when missing sensor', () => {
    const components = [
      createManifest({ name: 'brain', kind: 'processor' }),
      createManifest({ name: 'git', kind: 'actuator' }),
    ];

    const result = checkRequiredComponents(components);
    expect(result.severity).toBe('error');
    expect(result.details).toBeDefined();
    expect(result.details!.some((d) => d.includes('sensor'))).toBe(true);
  });

  it('should warn when missing actuator', () => {
    const components = [
      createManifest({ name: 'http', kind: 'sensor' }),
    ];

    const result = checkRequiredComponents(components);
    expect(result.severity).toBe('error');
    expect(result.details!.some((d) => d.includes('actuator'))).toBe(true);
  });

  it('should pass with sensor and actuator', () => {
    const components = [
      createManifest({ name: 'http', kind: 'sensor' }),
      createManifest({ name: 'git', kind: 'actuator' }),
    ];

    const result = checkRequiredComponents(components);
    expect(result.severity).toBe('ok');
  });
});

describe('Quality: Dependency Check', () => {
  it('should pass with satisfied deps', () => {
    const components = [
      createManifest({ name: 'http', kind: 'sensor' }),
      createManifest({ name: 'brain', kind: 'processor', dependencies: ['http'] }),
    ];

    expect(checkDependencies(components).severity).toBe('ok');
  });

  it('should fail with unsatisfied deps', () => {
    const components = [
      createManifest({ name: 'brain', kind: 'processor', dependencies: ['missing'] }),
    ];

    expect(checkDependencies(components).severity).toBe('error');
  });
});

describe('Quality: Workshop Check', () => {
  it('should warn when no dirs provided', () => {
    const result = checkWorkshop(undefined);
    expect(result.severity).toBe('warning');
  });

  it('should fail with missing workshop dirs', () => {
    const result = checkWorkshop(['workshop/recipes']);
    expect(result.severity).toBe('error');
  });

  it('should pass with all required dirs', () => {
    const dirs = [
      'workshop/recipes',
      'workshop/scripts',
      'dojo',
      'bootcamp',
      '.agent',
    ];

    expect(checkWorkshop(dirs).severity).toBe('ok');
  });
});

describe('Quality: Full Report', () => {
  it('should produce a passing report for a valid agent', () => {
    const identity = createIdentity({
      id: 'qa-agent',
      name: 'QA Agent',
      keeperUrl: 'https://keeper.example.com',
      model: 'glm-5',
    });

    const components = [
      createManifest({ name: 'http', kind: 'sensor' }),
      createManifest({ name: 'brain', kind: 'processor', dependencies: ['http'] }),
      createManifest({ name: 'git', kind: 'actuator', dependencies: ['brain'] }),
      createManifest({ name: 'cache', kind: 'memory' }),
    ];

    const report = runQualityChecks({
      identity,
      components,
      workshopDirs: [
        'workshop/recipes',
        'workshop/scripts',
        'dojo',
        'bootcamp',
        '.agent',
      ],
    });

    expect(report.passed).toBe(true);
    expect(report.agentId).toBe('qa-agent');
    expect(report.score).toBeGreaterThan(0);
    expect(report.timestamp).toBeTruthy();
  });

  it('should produce a failing report for an empty agent', () => {
    const report = runQualityChecks({});

    expect(report.passed).toBe(false);
    expect(report.agentId).toBe('unknown');
    expect(report.checks.length).toBeGreaterThan(0);
  });
});
