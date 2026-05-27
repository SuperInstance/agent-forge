/**
 * Components — The building blocks that make up an agent.
 *
 * Agents are assembled from four types of components:
 *
 *   Sensor    — Receives input (messages, events, webhooks, file changes)
 *   Processor — Transforms data (LLM calls, parsers, filters, routers)
 *   Actuator  — Produces output (commits, messages, API calls, file writes)
 *   Memory    — Stores state (databases, file caches, context windows)
 *
 * Each component has a manifest describing its interface:
 *   - What it consumes (input schema)
 *   - What it produces (output schema)
 *   - What it needs (dependencies)
 *   - How to configure it (config schema)
 */

export type ComponentKind = 'sensor' | 'processor' | 'actuator' | 'memory';

export interface ComponentManifest {
  name: string;
  kind: ComponentKind;
  version: string;
  description: string;
  /** JSON Schema-like input spec */
  inputSchema: Record<string, unknown>;
  /** JSON Schema-like output spec */
  outputSchema: Record<string, unknown>;
  /** Names of other components this one depends on */
  dependencies: string[];
  /** Default configuration */
  defaultConfig: Record<string, unknown>;
  /** Whether this component is required for the agent to function */
  required: boolean;
  /** Tags for categorization */
  tags: string[];
}

export interface ComponentInstance {
  manifest: ComponentManifest;
  config: Record<string, unknown>;
  enabled: boolean;
  /** When this component was added to the agent */
  addedAt: string;
  /** How many times it has been invoked */
  invokeCount: number;
}

/**
 * Create a new component manifest with validation.
 */
export function createManifest(opts: {
  name: string;
  kind: ComponentKind;
  version?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  dependencies?: string[];
  defaultConfig?: Record<string, unknown>;
  required?: boolean;
  tags?: string[];
}): ComponentManifest {
  if (!opts.name || !/^[a-z][a-z0-9-]*$/.test(opts.name)) {
    throw new Error(
      `Invalid component name "${opts.name}": must be lowercase alphanumeric with dashes, starting with a letter`
    );
  }

  return {
    name: opts.name,
    kind: opts.kind,
    version: opts.version || '1.0.0',
    description: opts.description || `${opts.kind} component: ${opts.name}`,
    inputSchema: opts.inputSchema || {},
    outputSchema: opts.outputSchema || {},
    dependencies: opts.dependencies || [],
    defaultConfig: opts.defaultConfig || {},
    required: opts.required ?? false,
    tags: opts.tags || [],
  };
}

/**
 * Instantiate a component from its manifest with optional config overrides.
 */
export function instantiate(
  manifest: ComponentManifest,
  configOverrides?: Record<string, unknown>
): ComponentInstance {
  return {
    manifest,
    config: { ...manifest.defaultConfig, ...configOverrides },
    enabled: true,
    addedAt: new Date().toISOString(),
    invokeCount: 0,
  };
}

/**
 * Validate that all dependencies are satisfied for a set of components.
 * Returns list of missing dependency names.
 */
export function validateDependencies(
  components: ComponentManifest[]
): string[] {
  const names = new Set(components.map((c) => c.name));
  const missing: string[] = [];

  for (const comp of components) {
    for (const dep of comp.dependencies) {
      if (!names.has(dep)) {
        missing.push(`${comp.name} → ${dep}`);
      }
    }
  }

  return missing;
}

/**
 * Group components by kind.
 */
export function groupByKind(
  components: ComponentManifest[]
): Record<ComponentKind, ComponentManifest[]> {
  const groups: Record<ComponentKind, ComponentManifest[]> = {
    sensor: [],
    processor: [],
    actuator: [],
    memory: [],
  };

  for (const comp of components) {
    groups[comp.kind].push(comp);
  }

  return groups;
}

/**
 * Check if a component version satisfies a minimum version requirement.
 * Simple semver major.minor.patch comparison.
 */
export function versionSatisfies(
  actual: string,
  minimum: string
): boolean {
  const parse = (v: string) =>
    v.split('.').map((n) => parseInt(n, 10));
  const a = parse(actual);
  const m = parse(minimum);

  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) > (m[i] || 0)) return true;
    if ((a[i] || 0) < (m[i] || 0)) return false;
  }

  return true; // equal
}
