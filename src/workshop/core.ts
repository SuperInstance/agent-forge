/**
 * Workshop — The agent's accumulated brain.
 *
 * The workshop is a directory structure within the agent's repo:
 *
 *   workshop/
 *     recipes/     ← Compiled commands for common tasks (built over time)
 *     scripts/     ← Raw scripts and tools
 *     interpreters/ ← Custom mini-languages built for specific tasks
 *   dojo/          ← Skill training exercises
 *   bootcamp/      ← Onboarding tutorials and reference material
 *   .agent/
 *     identity.json  ← Who this agent is
 *     config.json    ← Runtime configuration
 *     session-log.md ← Running narrative of what happened
 *
 * The workshop grows over time. As the agent solves problems, it:
 *   1. Commits raw scripts to scripts/
 *   2. Refines them into recipes/ (higher-level commands)
 *   3. Eventually builds interpreters/ (domain-specific languages)
 *   4. Each iteration is captured in git history
 *
 * The commit history IS the agent's autobiography. Each commit is a
 * thought captured in code. You can rewind to any point and see
 * exactly what the agent was thinking and doing.
 *
 * Temperature modes:
 *   hot  — Creative, exploratory, high-risk, fast iteration
 *   warm — Balanced, measured, good for most work
 *   cold — Precise, conservative, careful, for critical tasks
 */

export interface Recipe {
  name: string;
  description: string;
  /** What language the recipe is written in */
  language: string;
  /** The actual script/command */
  content: string;
  /** When this recipe was created */
  createdAt: string;
  /** How many times it has been used successfully */
  runCount: number;
  /** Dependencies (other recipes this one needs) */
  dependencies: string[];
  /** Tags for discovery */
  tags: string[];
  /** Difficulty level */
  level: 'beginner' | 'intermediate' | 'advanced' | 'master';
}

export interface DojoExercise {
  id: string;
  name: string;
  description: string;
  /** What skill this exercises */
  skill: string;
  /** Instructions for the exercise */
  instructions: string;
  /** Validation function (how to check if completed) */
  validate: string;
  /** Difficulty */
  level: 1 | 2 | 3 | 4 | 5;
  /** Required completion before moving on */
  prerequisite?: string;
}

export interface WorkshopIndex {
  recipes: Record<string, Recipe>;
  scripts: string[];
  interpreters: string[];
  dojoExercises: string[];
  bootcampModules: string[];
  totalCommits: number;
  lastActivity: string;
}

export type Temperature = 'hot' | 'warm' | 'cold';

export const TEMPERATURE_DEFAULTS: Record<Temperature, {
  riskTolerance: number;
  maxWorkers: number;
  autoCommitInterval: number;
  commitStyle: string;
  thinkStyle: string;
}> = {
  hot: {
    riskTolerance: 0.9,
    maxWorkers: 8,
    autoCommitInterval: 60,
    commitStyle: 'aggressive — commit often, push early',
    thinkStyle: 'divergent — explore many paths, favor novelty',
  },
  warm: {
    riskTolerance: 0.7,
    maxWorkers: 4,
    autoCommitInterval: 300,
    commitStyle: 'measured — commit when milestone reached',
    thinkStyle: 'balanced — explore then converge',
  },
  cold: {
    riskTolerance: 0.3,
    maxWorkers: 2,
    autoCommitInterval: 600,
    commitStyle: 'conservative — commit only when verified correct',
    thinkStyle: 'convergent — careful step-by-step reasoning',
  },
};

/**
 * Initialize a new workshop directory structure.
 */
export async function initWorkshop(workdir: string): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const dirs = [
    'workshop/recipes',
    'workshop/scripts',
    'workshop/interpreters',
    'dojo',
    'bootcamp',
    '.agent',
  ];

  for (const dir of dirs) {
    await fs.mkdir(path.join(workdir, dir), { recursive: true });
  }

  // Create workshop index
  const index: WorkshopIndex = {
    recipes: {},
    scripts: [],
    interpreters: [],
    dojoExercises: [],
    bootcampModules: [],
    totalCommits: 0,
    lastActivity: new Date().toISOString(),
  };

  await fs.writeFile(
    path.join(workdir, 'workshop', 'INDEX.json'),
    JSON.stringify(index, null, 2),
    'utf-8'
  );

  // Create README in each directory
  const readmes: Record<string, string> = {
    'workshop/README.md': '# Workshop\n\nThis is where accumulated tools live. It grows over time as the agent works.',
    'workshop/recipes/README.md': '# Recipes\n\nCompiled commands for common tasks. These are the "compiled knowledge" of the workshop.\n\nRecipes start as raw scripts, get refined through iteration, and eventually become reliable commands that reduce reasoning overhead.',
    'workshop/scripts/README.md': '# Scripts\n\nRaw scripts and tools. The starting point before refinement into recipes.',
    'workshop/interpreters/README.md': '# Interpreters\n\nCustom mini-languages built for specific tasks. When generic tools aren\'t enough, build an interpreter that\'s "just so" for the application\'s needs.',
    'dojo/README.md': '# Dojo\n\nSkill training exercises. Each exercise targets a specific capability.\n\nProgression:\n- Level 1-2: Bootcamp basics\n- Level 3: Intermediate skills\n- Level 4-5: Advanced mastery\n\nComplete exercises to unlock new recipe patterns.',
    'bootcamp/README.md': '# Bootcamp\n\nOnboarding material and reference documentation.\n\nNew agents start here. Read these modules in order:\n1. HOW-TO-THINK.md — Problem-solving methodology\n2. HOW-TO-COMMIT.md — Git workflow and commit style\n3. HOW-TO-BUILD.md — Workshop construction patterns\n4. HOW-TO-DELEGATE.md — When and how to spawn sub-agents',
  };

  for (const [file, content] of Object.entries(readmes)) {
    await fs.writeFile(path.join(workdir, file), content, 'utf-8');
  }
}

/**
 * Record an action in the session log.
 */
export async function recordSession(workdir: string, entry: {
  timestamp?: string;
  action: string;
  details?: string;
  temperature?: Temperature;
}): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const logPath = path.join(workdir, '.agent', 'session-log.md');

  const timestamp = entry.timestamp || new Date().toISOString();
  const tempLabel = entry.temperature ? `[${entry.temperature.toUpperCase()}]` : '';

  const line = `\n## ${timestamp} ${tempLabel}\n**${entry.action}**\n${entry.details ? entry.details + '\n' : ''}`;

  let existing = '';
  try {
    existing = await fs.readFile(logPath, 'utf-8');
  } catch {
    existing = '# Session Log\n\nThis log tells the story of this agent\'s work.\n';
  }

  await fs.writeFile(logPath, existing + line, 'utf-8');
}
