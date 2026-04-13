import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

import { createIdentity, loadIdentity, saveIdentity, IDENTITY_FILE } from '../src/cli/identity.js';
import { KeeperClient } from '../src/keeper/client.js';
import { initWorkshop, recordSession, TEMPERATURE_DEFAULTS } from '../src/workshop/core.js';
import { buildCommitMessage, getCommitStyle, getThinkStyle, planChildSpawn } from '../src/git-agent/core.js';

let tmpdir: string;

beforeEach(async () => {
  tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-forge-test-'));
});

afterEach(async () => {
  await fs.rm(tmpdir, { recursive: true, force: true });
});

// ─── Identity Tests ────────────────────────────────────────────

describe('Identity', () => {
  it('should create an identity with defaults', () => {
    const id = createIdentity({
      id: 'test-agent',
      name: 'Test Agent',
      keeperUrl: 'https://keeper.example.com',
      model: 'glm-5',
    });

    expect(id.id).toBe('test-agent');
    expect(id.name).toBe('Test Agent');
    expect(id.rank).toBe('greenhorn');
    expect(id.model).toBe('glm-5');
    expect(id.keeperUrl).toBe('https://keeper.example.com');
    expect(id.scopes).toEqual([]);
    expect(id.temperature).toBe('warm');
    expect(id.maxWorkers).toBe(4);
    expect(id.riskTolerance).toBe(0.7);
    expect(id.onboardedAt).toBeTruthy();
  });

  it('should create identity with all options', () => {
    const id = createIdentity({
      id: 'hot-agent',
      name: 'Hot Agent',
      keeperUrl: 'https://keeper.example.com',
      model: 'claude-3.5',
      temperature: 'hot',
      githubUser: 'octocat',
      githubEmail: 'octocat@github.com',
      parentAgent: 'superz',
    });

    expect(id.temperature).toBe('hot');
    expect(id.githubUser).toBe('octocat');
    expect(id.parentAgent).toBe('superz');
  });

  it('should save and load identity from disk', async () => {
    const identity = createIdentity({
      id: 'persist-test',
      name: 'Persist Test',
      keeperUrl: 'https://keeper.example.com',
      model: 'glm-5',
    });

    await saveIdentity(tmpdir, identity);
    const loaded = await loadIdentity(tmpdir);

    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe('persist-test');
    expect(loaded!.name).toBe('Persist Test');
    expect(loaded!.temperature).toBe('warm');
  });

  it('should return null for missing identity', async () => {
    const loaded = await loadIdentity(tmpdir);
    expect(loaded).toBeNull();
  });

  it('should create .agent directory', async () => {
    const identity = createIdentity({
      id: 'dir-test',
      name: 'Dir Test',
      keeperUrl: 'https://keeper.example.com',
      model: 'glm-5',
    });

    await saveIdentity(tmpdir, identity);
    const stat = await fs.stat(path.join(tmpdir, '.agent'));
    expect(stat.isDirectory()).toBe(true);
  });
});

// ─── Workshop Tests ───────────────────────────────────────────

describe('Workshop', () => {
  it('should initialize workshop directory structure', async () => {
    await initWorkshop(tmpdir);

    const expectedDirs = [
      'workshop/recipes',
      'workshop/scripts',
      'workshop/interpreters',
      'dojo',
      'bootcamp',
      '.agent',
    ];

    for (const dir of expectedDirs) {
      const stat = await fs.stat(path.join(tmpdir, dir));
      expect(stat.isDirectory()).toBe(true);
    }
  });

  it('should create workshop INDEX.json', async () => {
    await initWorkshop(tmpdir);
    const raw = await fs.readFile(path.join(tmpdir, 'workshop', 'INDEX.json'), 'utf-8');
    const index = JSON.parse(raw);

    expect(index.recipes).toEqual({});
    expect(index.scripts).toEqual([]);
    expect(index.interpreters).toEqual([]);
    expect(index.totalCommits).toBe(0);
    expect(index.lastActivity).toBeTruthy();
  });

  it('should create README files in each directory', async () => {
    await initWorkshop(tmpdir);

    const expectedReadmes = [
      'workshop/README.md',
      'workshop/recipes/README.md',
      'workshop/scripts/README.md',
      'workshop/interpreters/README.md',
      'dojo/README.md',
      'bootcamp/README.md',
    ];

    for (const readme of expectedReadmes) {
      const content = await fs.readFile(path.join(tmpdir, readme), 'utf-8');
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it('should record session entries', async () => {
    await initWorkshop(tmpdir);

    await recordSession(tmpdir, {
      action: 'TEST_ACTION',
      details: 'This is a test session entry',
      temperature: 'warm',
    });

    const log = await fs.readFile(path.join(tmpdir, '.agent', 'session-log.md'), 'utf-8');
    expect(log).toContain('TEST_ACTION');
    expect(log).toContain('This is a test session entry');
    expect(log).toContain('WARM');
  });

  it('should append multiple session entries', async () => {
    await initWorkshop(tmpdir);

    await recordSession(tmpdir, { action: 'FIRST' });
    await recordSession(tmpdir, { action: 'SECOND' });
    await recordSession(tmpdir, { action: 'THIRD' });

    const log = await fs.readFile(path.join(tmpdir, '.agent', 'session-log.md'), 'utf-8');
    expect(log).toContain('FIRST');
    expect(log).toContain('SECOND');
    expect(log).toContain('THIRD');
  });

  it('should create session log header on first entry', async () => {
    await initWorkshop(tmpdir);

    await recordSession(tmpdir, { action: 'INIT' });

    const log = await fs.readFile(path.join(tmpdir, '.agent', 'session-log.md'), 'utf-8');
    expect(log).toContain('# Session Log');
  });
});

// ─── Temperature Tests ────────────────────────────────────────

describe('Temperature', () => {
  it('should have defaults for all modes', () => {
    expect(TEMPERATURE_DEFAULTS.hot).toBeDefined();
    expect(TEMPERATURE_DEFAULTS.warm).toBeDefined();
    expect(TEMPERATURE_DEFAULTS.cold).toBeDefined();
  });

  it('hot should have highest risk tolerance', () => {
    expect(TEMPERATURE_DEFAULTS.hot.riskTolerance).toBeGreaterThan(TEMPERATURE_DEFAULTS.warm.riskTolerance);
    expect(TEMPERATURE_DEFAULTS.warm.riskTolerance).toBeGreaterThan(TEMPERATURE_DEFAULTS.cold.riskTolerance);
  });

  it('hot should have most workers', () => {
    expect(TEMPERATURE_DEFAULTS.hot.maxWorkers).toBeGreaterThan(TEMPERATURE_DEFAULTS.cold.maxWorkers);
  });

  it('cold should have longest auto-commit interval', () => {
    expect(TEMPERATURE_DEFAULTS.cold.autoCommitInterval).toBeGreaterThan(TEMPERATURE_DEFAULTS.hot.autoCommitInterval);
  });
});

// ─── GitAgent Tests ───────────────────────────────────────────

describe('GitAgent', () => {
  it('should build conventional commit messages', () => {
    const msg = buildCommitMessage('add vault module', {
      type: 'feat',
      scope: 'vault',
      body: 'Implements encrypted secret storage with env var loading.',
    });
    expect(msg).toContain('feat(vault):');
    expect(msg).toContain('add vault module');
    expect(msg).toContain('Implements encrypted secret storage');
  });

  it('should build breaking change commits', () => {
    const msg = buildCommitMessage('change auth API', {
      type: 'feat',
      breaking: true,
      body: 'Old auth endpoints removed.',
    });
    expect(msg).toContain('feat!:');
  });

  it('should default to feat type', () => {
    const msg = buildCommitMessage('something happened');
    expect(msg).toContain('feat: something happened');
  });

  it('should get commit style for each temperature', () => {
    expect(getCommitStyle('hot')).toContain('Aggressive');
    expect(getCommitStyle('warm')).toContain('Measured');
    expect(getCommitStyle('cold')).toContain('Conservative');
  });

  it('should get think style for each temperature', () => {
    expect(getThinkStyle('hot')).toContain('Explore');
    expect(getThinkStyle('warm')).toContain('Plan');
    expect(getThinkStyle('cold')).toContain('Analyze');
  });

  it('should plan child agent spawn', () => {
    const identity = createIdentity({
      id: 'parent',
      name: 'Parent Agent',
      keeperUrl: 'https://keeper.example.com',
      model: 'glm-5',
    });

    const plan = planChildSpawn(identity, 'Build tests for the vault module');
    expect(plan.suggestedId).toContain('parent');
    expect(plan.suggestedName).toContain('sub');
    expect(plan.branchName).toContain('parent');
    expect(plan.branchName).toContain('build-tests');
  });

  it('child agent plan should reference parent', () => {
    const identity = createIdentity({
      id: 'superz',
      name: 'Super Z',
      keeperUrl: 'https://keeper.example.com',
      model: 'glm-5',
    });

    const plan = planChildSpawn(identity, 'CI workflow');
    expect(plan.suggestedId).toMatch(/^superz-/);
  });
});

// ─── KeeperClient Tests ───────────────────────────────────────

describe('KeeperClient', () => {
  it('should construct with config', () => {
    const client = new KeeperClient({
      keeperUrl: 'https://keeper.example.com',
      agentId: 'test-agent',
    });
    expect(client.url).toBe('https://keeper.example.com');
  });

  it('should strip trailing slashes from URL', () => {
    const client = new KeeperClient({
      keeperUrl: 'https://keeper.example.com/',
      agentId: 'test-agent',
    });
    expect(client.url).toBe('https://keeper.example.com');
  });

  it('should have no token initially', () => {
    const client = new KeeperClient({
      keeperUrl: 'https://keeper.example.com',
      agentId: 'test-agent',
    });
    expect(client.currentToken).toBeNull();
    expect(client.hasValidToken()).toBe(false);
  });

  it('should set and track token', () => {
    const client = new KeeperClient({
      keeperUrl: 'https://keeper.example.com',
      agentId: 'test-agent',
    });

    const futureDate = new Date(Date.now() + 86400000).toISOString();
    client.setToken('test-token-123', futureDate);
    expect(client.currentToken).toBe('test-token-123');
    expect(client.hasValidToken()).toBe(true);
  });

  it('should detect expired tokens', () => {
    const client = new KeeperClient({
      keeperUrl: 'https://keeper.example.com',
      agentId: 'test-agent',
    });

    const pastDate = new Date(Date.now() - 1000).toISOString();
    client.setToken('expired-token', pastDate);
    expect(client.hasValidToken()).toBe(false);
  });
});

// ─── Integration: Full Onboard Flow ───────────────────────────

describe('Integration: Full Onboard', () => {
  it('should complete full onboard flow', async () => {
    // Create identity
    const identity = createIdentity({
      id: 'integration-test',
      name: 'Integration Test Agent',
      keeperUrl: 'https://keeper.example.com',
      model: 'glm-5',
      temperature: 'cold',
      githubUser: 'testuser',
    });

    // Init workshop
    await initWorkshop(tmpdir);

    // Save identity
    await saveIdentity(tmpdir, identity);

    // Record session
    await recordSession(tmpdir, {
      action: 'ONBOARDED',
      details: 'Integration test agent onboarded successfully.',
      temperature: 'cold',
    });

    // Verify everything on disk
    const loaded = await loadIdentity(tmpdir);
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe('integration-test');
    expect(loaded!.temperature).toBe('cold');

    const log = await fs.readFile(path.join(tmpdir, '.agent', 'session-log.md'), 'utf-8');
    expect(log).toContain('ONBOARDED');
    expect(log).toContain('COLD');

    const workshopIndex = JSON.parse(
      await fs.readFile(path.join(tmpdir, 'workshop', 'INDEX.json'), 'utf-8')
    );
    expect(workshopIndex.totalCommits).toBe(0);
  });

  it('should support agent with parent reference', async () => {
    const parent = createIdentity({
      id: 'parent-agent',
      name: 'Parent',
      keeperUrl: 'https://keeper.example.com',
      model: 'glm-5',
    });

    const child = createIdentity({
      id: 'child-agent',
      name: 'Child of Parent',
      keeperUrl: parent.keeperUrl,
      model: 'claude-3.5',
      parentAgent: parent.id,
    });

    expect(child.parentAgent).toBe('parent-agent');

    await saveIdentity(tmpdir, child);
    const loaded = await loadIdentity(tmpdir);
    expect(loaded!.parentAgent).toBe('parent-agent');
  });
});
