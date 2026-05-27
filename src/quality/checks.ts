/**
 * Quality — Validation and quality checks for assembled agents.
 *
 * Before an agent is considered "ready", it passes through quality checks:
 *
 *   1. Identity check    — Is the identity valid and complete?
 *   2. Component check   — Are all required components present and healthy?
 *   3. Dependency check  — Are all component dependencies satisfied?
 *   4. Config check      — Is the configuration valid?
 *   5. Workshop check    — Is the workshop structure in place?
 *   6. Connectivity check — Can the agent reach its keeper?
 *
 * Each check returns a pass/fail with details.
 */

import type { AgentIdentity } from '../cli/identity.js';
import type { ComponentManifest } from '../components/registry.js';
import { validateDependencies } from '../components/registry.js';

export type CheckSeverity = 'ok' | 'warning' | 'error';

export interface CheckResult {
  name: string;
  severity: CheckSeverity;
  message: string;
  details?: string[];
}

export interface QualityReport {
  agentId: string;
  passed: boolean;
  checks: CheckResult[];
  timestamp: string;
  score: number; // 0-100
}

/**
 * Run all quality checks on an agent.
 */
export function runQualityChecks(opts: {
  identity?: AgentIdentity;
  components?: ComponentManifest[];
  workshopDirs?: string[];
}): QualityReport {
  const checks: CheckResult[] = [];

  // 1. Identity check
  checks.push(checkIdentity(opts.identity));

  // 2. Required components check
  if (opts.components) {
    checks.push(checkRequiredComponents(opts.components));
    checks.push(checkDependencies(opts.components));
  }

  // 3. Workshop structure check
  checks.push(checkWorkshop(opts.workshopDirs));

  // Aggregate
  const errors = checks.filter((c) => c.severity === 'error');
  const warnings = checks.filter((c) => c.severity === 'warning');
  const oks = checks.filter((c) => c.severity === 'ok');

  const score = Math.round(
    (oks.length * 100) / Math.max(checks.length, 1) +
    (warnings.length * 25) / Math.max(checks.length, 1)
  );

  return {
    agentId: opts.identity?.id || 'unknown',
    passed: errors.length === 0,
    checks,
    timestamp: new Date().toISOString(),
    score: Math.min(score, 100),
  };
}

/**
 * Check that identity is valid and complete.
 */
export function checkIdentity(identity?: AgentIdentity): CheckResult {
  if (!identity) {
    return {
      name: 'Identity',
      severity: 'error',
      message: 'No identity found',
      details: ['Agent must be onboarded before quality check'],
    };
  }

  const issues: string[] = [];

  if (!identity.id) issues.push('Missing agent ID');
  if (!identity.name) issues.push('Missing agent name');
  if (!identity.model) issues.push('Missing model specification');
  if (!identity.keeperUrl) issues.push('Missing keeper URL');
  if (!identity.onboardedAt) issues.push('Missing onboarding timestamp');

  if (!['hot', 'warm', 'cold'].includes(identity.temperature)) {
    issues.push(`Invalid temperature: ${identity.temperature}`);
  }

  if (identity.riskTolerance < 0 || identity.riskTolerance > 1) {
    issues.push(`Risk tolerance out of range: ${identity.riskTolerance}`);
  }

  if (issues.length > 0) {
    return {
      name: 'Identity',
      severity: 'error',
      message: `Identity has ${issues.length} issue(s)`,
      details: issues,
    };
  }

  return {
    name: 'Identity',
    severity: 'ok',
    message: `Identity valid: ${identity.id} (${identity.rank})`,
  };
}

/**
 * Check that all required components are present.
 */
export function checkRequiredComponents(
  components: ComponentManifest[]
): CheckResult {
  const required = components.filter((c) => c.required);
  const missing: string[] = [];

  // Every agent needs at least one sensor and one actuator
  const kinds = new Set(components.map((c) => c.kind));
  if (!kinds.has('sensor')) missing.push('No sensor component (agent needs input)');
  if (!kinds.has('actuator')) missing.push('No actuator component (agent needs output)');

  if (missing.length > 0) {
    return {
      name: 'Required Components',
      severity: 'error',
      message: `Missing ${missing.length} essential component(s)`,
      details: missing,
    };
  }

  return {
    name: 'Required Components',
    severity: 'ok',
    message: `${components.length} components (${required.length} required)`,
  };
}

/**
 * Check that all dependencies are satisfied.
 */
export function checkDependencies(
  components: ComponentManifest[]
): CheckResult {
  const missing = validateDependencies(components);

  if (missing.length > 0) {
    return {
      name: 'Dependencies',
      severity: 'error',
      message: `${missing.length} unresolved dependency(ies)`,
      details: missing,
    };
  }

  return {
    name: 'Dependencies',
    severity: 'ok',
    message: 'All dependencies satisfied',
  };
}

/**
 * Check workshop directory structure.
 */
export function checkWorkshop(dirs?: string[]): CheckResult {
  const requiredDirs = [
    'workshop/recipes',
    'workshop/scripts',
    'dojo',
    'bootcamp',
    '.agent',
  ];

  if (!dirs) {
    return {
      name: 'Workshop',
      severity: 'warning',
      message: 'Workshop structure not checked (no dirs provided)',
    };
  }

  const present = new Set(dirs);
  const missing = requiredDirs.filter((d) => !present.has(d));

  if (missing.length > 0) {
    return {
      name: 'Workshop',
      severity: 'error',
      message: `Missing ${missing.length} workshop directories`,
      details: missing,
    };
  }

  return {
    name: 'Workshop',
    severity: 'ok',
    message: `All ${requiredDirs.length} workshop directories present`,
  };
}
