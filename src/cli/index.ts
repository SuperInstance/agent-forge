#!/usr/bin/env node

/**
 * agent-forge CLI — The entry point for all standalone agents.
 *
 * Usage:
 *   agent --onboard          First-time setup (register with keeper, set identity)
 *   agent --work <task>      Do work in warm (default) mode
 *   agent --work <task> --hot    Do work in creative mode
 *   agent --work <task> --cold   Do work in precise mode
 *   agent --status           Show agent status
 *   agent --keeper-status    Check keeper health
 *   agent --session-log      Show session history
 *   agent --spawn <task>     Spawn a child agent for a subtask
 *   agent --dojo             Enter the dojo (skill training)
 *   agent --temperature <mode>  Switch thinking mode
 */

import { createIdentity, loadIdentity, saveIdentity, type AgentIdentity } from './identity.js';
import { KeeperClient } from '../keeper/client.js';
import { initWorkshop, recordSession, TEMPERATURE_DEFAULTS, type Temperature } from '../workshop/core.js';
import { buildCommitMessage, getCommitStyle, getThinkStyle, planChildSpawn, executeTask } from '../git-agent/core.js';

const DEFAULT_SCOPES = ['openai:chat', 'anthropic:chat', 'github:read', 'github:write'];

function printBanner(): void {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                   AGENT FORGE v1.0                     ║
  ║   Standalone Git-Agent Framework                      ║
  ║   Download · Onboard · Work · Leave Your Story         ║
  ║   "Your repo is your brain. Your commits are your       ║
  ║    autobiography."                                      ║
  ╚═══════════════════════════════════════════════════════╝
`);
}

async function onboard(workdir: string): Promise<void> {
  console.log('\n  === ONBOARDING ===\n');
  console.log('  Welcome to the forge. Let\'s set up your agent identity.\n');

  // Collect info via command line args or prompts
  const args = process.argv.slice(3);

  // Try to read from command line
  let keeperUrl = '';
  let agentId = '';
  let agentName = '';
  let model = '';
  let temperature: Temperature = 'warm';
  let githubUser = '';
  let githubEmail = '';

  // Simple arg parsing: --keeper-url X --id X --name X --model X --temp X
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--keeper-url': keeperUrl = args[++i]; break;
      case '--id': agentId = args[++i]; break;
      case '--name': agentName = args[++i]; break;
      case '--model': model = args[++i]; break;
      case '--temp': temperature = args[++i] as Temperature; break;
      case '--github-user': githubUser = args[++i]; break;
      case '--github-email': githubEmail = args[++i]; break;
    }
  }

  // If missing required args, show usage
  if (!keeperUrl || !agentId || !agentName) {
    console.log('  Usage: agent --onboard --keeper-url <url> --id <id> --name <name> [options]\n');
    console.log('  Required:');
    console.log('    --keeper-url <url>    URL of your keeper-agent (e.g. https://keeper.example.com)');
    console.log('    --id <id>             Unique agent ID (e.g. "superz", "jetsonclaw-3")');
    console.log('    --name <name>         Human-readable name\n');
    console.log('  Optional:');
    console.log('    --model <model>       Primary model (default: "glm-5")');
    console.log('    --temp <mode>         Temperature: hot/warm/cold (default: warm)');
    console.log('    --github-user <user>  GitHub username for commits');
    console.log('    --github-email <mail> GitHub email for commits');
    console.log('\n  Example:');
    console.log('    agent --onboard --keeper-url https://keeper.superinstance.dev \\\n');
    console.log('      --id superz --name "Super Z" --model glm-5 --temp warm \\\n');
    console.log('      --github-user SuperInstance --github-email super-z@fluxfleet.dev\n');
    return;
  }

  model = model || 'glm-5';

  if (!['hot', 'warm', 'cold'].includes(temperature)) {
    console.log(`  Warning: invalid temperature "${temperature}", defaulting to "warm"`);
    temperature = 'warm';
  }

  console.log(`  Agent ID:      ${agentId}`);
  console.log(`  Agent Name:    ${agentName}`);
  console.log(`  Model:         ${model}`);
  console.log(`  Temperature:   ${temperature}`);
  console.log(`  Keeper URL:    ${keeperUrl}`);
  console.log(`  GitHub:        ${githubUser || '(not set)'}`);
  console.log('');

  // Step 1: Create identity
  const identity = createIdentity({
    id: agentId,
    name: agentName,
    model,
    keeperUrl,
    githubUser: githubUser || undefined,
    githubEmail: githubEmail || undefined,
    temperature,
  });

  // Step 2: Initialize workshop structure
  console.log('  [1/4] Initializing workshop...');
  await initWorkshop(workdir);
  console.log('        workshop/recipes/    — compiled commands');
  console.log('        workshop/scripts/    — raw tools');
  console.log('        workshop/interpreters/ — custom languages');
  console.log('        dojo/                — skill training');
  console.log('        bootcamp/            — onboarding material');
  console.log('        .agent/              — identity & config');

  // Step 3: Register with keeper
  console.log('  [2/4] Registering with keeper...');
  const keeper = new KeeperClient({ keeperUrl, agentId });

  const registered = await keeper.register(agentName, githubUser);
  if (registered) {
    console.log(`        Registered as "${agentId}" with keeper`);
  } else {
    console.log('        Warning: Could not reach keeper. You can register later.');
    console.log(`        Make sure keeper is running at ${keeperUrl}`);
  }

  // Step 4: Request token
  console.log('  [3/4] Requesting scoped token...');
  const token = await keeper.requestToken(DEFAULT_SCOPES);
  if (token) {
    console.log(`        Token received (expires: ${token.expiresAt})`);
    console.log(`        Scopes: ${token.scopes.join(', ')}`);
    identity.scopes = token.scopes;
  } else {
    console.log('        Warning: Could not get token. Run --onboard again later.');
  }

  // Save identity
  await saveIdentity(workdir, identity);
  console.log('  [4/4] Identity saved to .agent/identity.json');

  // Record first session entry
  await recordSession(workdir, {
    action: 'ONBOARDED',
    details: `Agent ${agentId} (${agentName}) onboarded.\nModel: ${model} | Temp: ${temperature} | Keeper: ${keeperUrl}\nScopes: ${identity.scopes.join(', ') || 'none'}`,
    temperature,
  });

  const tempConfig = TEMPERATURE_DEFAULTS[temperature];
  console.log('\n  === ONBOARDING COMPLETE ===\n');
  console.log(`  You are ${agentName}, operating in ${temperature.toUpperCase()} mode.`);
  console.log(`  Think style: ${tempConfig.thinkStyle}`);
  console.log(`  Commit style: ${tempConfig.commitStyle}`);
  console.log(`  Max workers: ${tempConfig.maxWorkers} | Risk tolerance: ${tempConfig.riskTolerance}`);
  console.log('\n  Ready to work. Use:');
  console.log('    agent --work <task>        Start working on a task');
  console.log('    agent --status             Show your status');
  console.log('    agent --session-log        View your story so far');
  console.log('    agent --temperature cold   Switch to cold mode\n');
}

async function showStatus(workdir: string): Promise<void> {
  const identity = await loadIdentity(workdir);
  if (!identity) {
    console.log('  Not onboarded yet. Run: agent --onboard');
    return;
  }

  console.log('\n  === AGENT STATUS ===\n');
  console.log(`  ID:           ${identity.id}`);
  console.log(`  Name:         ${identity.name}`);
  console.log(`  Rank:         ${identity.rank}`);
  console.log(`  Model:        ${identity.model}`);
  console.log(`  Temperature:  ${identity.temperature}`);
  console.log(`  Onboarded:    ${identity.onboardedAt}`);
  console.log(`  Keeper:       ${identity.keeperUrl}`);
  console.log(`  Scopes:       ${identity.scopes.join(', ') || '(none)'}`);
  console.log(`  Parent:       ${identity.parentAgent || '(none — root agent)'}`);

  // Check keeper connection
  const keeper = new KeeperClient({ keeperUrl: identity.keeperUrl, agentId: identity.id });
  try {
    const status = await keeper.status();
    console.log(`\n  Keeper Status:`);
    console.log(`    Status:      ${status.status}`);
    console.log(`    Agents:      ${status.agents}`);
    console.log(`    Secrets:     ${status.secrets}`);
    console.log(`    High Risk:   ${status.highRiskEvents}`);
  } catch {
    console.log('\n  Keeper: OFFLINE or unreachable');
  }

  const tempConfig = TEMPERATURE_DEFAULTS[identity.temperature];
  console.log(`\n  Mode: ${identity.temperature.toUpperCase()}`);
  console.log(`    Think: ${tempConfig.thinkStyle}`);
  console.log(`    Commit: ${tempConfig.commitStyle}`);
  console.log('');
}

async function showSessionLog(workdir: string): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');

  try {
    const log = await fs.readFile(path.join(workdir, '.agent', 'session-log.md'), 'utf-8');
    console.log('\n  === SESSION LOG ===\n');
    console.log(log);
  } catch {
    console.log('  No session log found. Run: agent --onboard');
  }
}

// ── Main ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  printBanner();

  const workdir = process.cwd();
  const command = process.argv[2];

  switch (command) {
    case '--onboard':
      await onboard(workdir);
      break;

    case '--status':
      await showStatus(workdir);
      break;

    case '--session-log':
      await showSessionLog(workdir);
      break;

    case '--keeper-status': {
      const identity = await loadIdentity(workdir);
      if (!identity) {
        console.log('  Not onboarded. Run: agent --onboard');
        break;
      }
      const keeper = new KeeperClient({ keeperUrl: identity.keeperUrl, agentId: identity.id });
      try {
        const status = await keeper.status();
        console.log('  Keeper Status:', JSON.stringify(status, null, 2));
      } catch (e) {
        console.log('  Keeper unreachable:', e instanceof Error ? e.message : 'unknown error');
      }
      break;
    }

    case '--work': {
      const task = process.argv.slice(3).find(a => !a.startsWith('--'));
      if (!task) {
        console.log('  Usage: agent --work <task description>');
        console.log('  Example: agent --work "Add tests to the vault module"');
        break;
      }
      const identity = await loadIdentity(workdir);
      if (!identity) {
        console.log('  Not onboarded. Run: agent --onboard first');
        break;
      }
      const tempArg = process.argv.find(a => a === '--hot' || a === '--warm' || a === '--cold');
      const temp = (tempArg?.slice(2) || identity.temperature) as Temperature;
      const keeper = new KeeperClient({ keeperUrl: identity.keeperUrl, agentId: identity.id });
      console.log(`  Working on: "${task}" in ${temp.toUpperCase()} mode`);
      console.log(`  Think: ${getThinkStyle(temp)}`);
      console.log(`  Commit: ${getCommitStyle(temp)}`);
      // Framework ready — LLM integration would go here
      console.log('  (Framework ready. LLM integration via keeper proxy needed for execution.)');
      break;
    }

    case '--temperature': {
      const mode = process.argv[3] as Temperature;
      if (!['hot', 'warm', 'cold'].includes(mode)) {
        console.log('  Usage: agent --temperature <hot|warm|cold>');
        break;
      }
      const identity = await loadIdentity(workdir);
      if (!identity) {
        console.log('  Not onboarded. Run: agent --onboard');
        break;
      }
      identity.temperature = mode;
      await saveIdentity(workdir, identity);
      const tempConfig = TEMPERATURE_DEFAULTS[mode];
      console.log(`  Temperature set to ${mode.toUpperCase()}`);
      console.log(`  Think: ${tempConfig.thinkStyle}`);
      console.log(`  Commit: ${tempConfig.commitStyle}`);
      await recordSession(workdir, {
        action: `TEMPERATURE CHANGE → ${mode.toUpperCase()}`,
        temperature: mode,
      });
      break;
    }

    case '--spawn': {
      const task = process.argv.slice(3).find(a => !a.startsWith('--'));
      if (!task) {
        console.log('  Usage: agent --spawn <subtask description>');
        break;
      }
      const identity = await loadIdentity(workdir);
      if (!identity) {
        console.log('  Not onboarded. Run: agent --onboard');
        break;
      }
      const plan = planChildSpawn(identity, task);
      console.log('  Child agent spawn plan:');
      console.log(`    ID:     ${plan.suggestedId}`);
      console.log(`    Name:   ${plan.suggestedName}`);
      console.log(`    Branch: ${plan.branchName}`);
      console.log('\n  To create this agent:');
      console.log(`    agent --onboard --id ${plan.suggestedId} --name "${plan.suggestedName}"`);
      break;
    }

    default:
      console.log('  Commands:');
      console.log('    agent --onboard                  First-time setup');
      console.log('    agent --work <task> [--hot|cold]  Do work');
      console.log('    agent --status                   Show status');
      console.log('    agent --keeper-status            Check keeper');
      console.log('    agent --session-log              View session history');
      console.log('    agent --temperature <mode>       Switch mode (hot/warm/cold)');
      console.log('    agent --spawn <subtask>          Plan a child agent');
      console.log('');
      break;
  }
}

main().catch(e => {
  console.error('Fatal:', e instanceof Error ? e.message : e);
  process.exit(1);
});
