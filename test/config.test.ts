import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { loadConfig, mergeConfig, getOutputDir } from '../src/config.js';
import type { Config } from '../src/types.js';

describe('loadConfig', () => {
  const testDir = join(process.cwd(), 'test-tmp-config');
  const configPath = join(testDir, '.gh-ci-artifacts.json');

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('returns empty config when no config file exists', () => {
    const config = loadConfig(testDir);
    expect(config).toEqual({});
  });

  it('loads valid config file', () => {
    const validConfig: Config = {
      outputDir: '/custom/output',
      defaultRepo: 'owner/repo',
      maxRetries: 5,
      retryDelay: 10,
    };
    writeFileSync(configPath, JSON.stringify(validConfig));

    const config = loadConfig(testDir);
    expect(config).toEqual(validConfig);
  });

  it('throws on invalid JSON', () => {
    writeFileSync(configPath, '{ invalid json }');

    expect(() => loadConfig(testDir)).toThrow('Failed to parse');
  });

  it('loads partial config', () => {
    const partialConfig: Config = {
      outputDir: '/custom/output',
    };
    writeFileSync(configPath, JSON.stringify(partialConfig));

    const config = loadConfig(testDir);
    expect(config).toEqual(partialConfig);
  });
});

describe('mergeConfig', () => {
  it('CLI args override file config', () => {
    const fileConfig: Config = {
      outputDir: '/file/output',
      maxRetries: 3,
    };
    const cliConfig: Partial<Config> = {
      outputDir: '/cli/output',
    };

    const merged = mergeConfig(fileConfig, cliConfig);
    expect(merged.outputDir).toBe('/cli/output');
    expect(merged.maxRetries).toBe(3);
  });

  it('applies defaults for missing values', () => {
    const fileConfig: Config = {};
    const cliConfig: Partial<Config> = {};

    const merged = mergeConfig(fileConfig, cliConfig);
    expect(merged.maxRetries).toBe(3);
    expect(merged.retryDelay).toBe(5);
  });

  it('file config used when CLI not provided', () => {
    const fileConfig: Config = {
      defaultRepo: 'owner/repo',
      maxRetries: 10,
    };
    const cliConfig: Partial<Config> = {};

    const merged = mergeConfig(fileConfig, cliConfig);
    expect(merged.defaultRepo).toBe('owner/repo');
    expect(merged.maxRetries).toBe(10);
  });
});

describe('getOutputDir', () => {
  it('uses config outputDir if provided', () => {
    const config: Config = {
      outputDir: '/custom/output',
    };

    const outputDir = getOutputDir(config, 123, '/cwd');
    expect(outputDir).toBe('/custom/output/123');
  });

  it('uses default .gh-ci-artifacts when no config', () => {
    const config: Config = {};

    const outputDir = getOutputDir(config, 456, '/cwd');
    expect(outputDir).toBe('/cwd/.gh-ci-artifacts/456');
  });

  it('appends PR number to output path', () => {
    const config: Config = {
      outputDir: '/base',
    };

    const outputDir = getOutputDir(config, 789, '/cwd');
    expect(outputDir).toBe('/base/789');
  });
});

describe('loadConfig with skip patterns', () => {
  const testDir = join(process.cwd(), 'test-tmp-config-skip');
  const configPath = join(testDir, '.gh-ci-artifacts.json');

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('loads config with global skip patterns', () => {
    const configWithSkip: Config = {
      skipArtifacts: [
        { pattern: '.*-screenshots$', reason: 'No screenshots' },
      ],
    };
    writeFileSync(configPath, JSON.stringify(configWithSkip));

    const config = loadConfig(testDir);
    expect(config.skipArtifacts).toBeDefined();
    expect(config.skipArtifacts).toHaveLength(1);
    expect(config.skipArtifacts![0].pattern).toBe('.*-screenshots$');
  });

  it('loads config with workflow configurations', () => {
    const configWithWorkflows: Config = {
      workflows: [
        {
          workflow: 'ci',
          skipArtifacts: [{ pattern: '.*-traces$' }],
        },
      ],
    };
    writeFileSync(configPath, JSON.stringify(configWithWorkflows));

    const config = loadConfig(testDir);
    expect(config.workflows).toBeDefined();
    expect(config.workflows).toHaveLength(1);
    expect(config.workflows![0].workflow).toBe('ci');
  });

  it('validates regex patterns in global skip', () => {
    const invalidConfig = {
      skipArtifacts: [{ pattern: '[invalid(regex' }],
    };
    writeFileSync(configPath, JSON.stringify(invalidConfig));

    expect(() => loadConfig(testDir)).toThrow('Invalid regex pattern');
  });

  it('validates regex patterns in workflow skip', () => {
    const invalidConfig = {
      workflows: [
        {
          workflow: 'ci',
          skipArtifacts: [{ pattern: '[invalid' }],
        },
      ],
    };
    writeFileSync(configPath, JSON.stringify(invalidConfig));

    expect(() => loadConfig(testDir)).toThrow('Invalid regex pattern');
    expect(() => loadConfig(testDir)).toThrow('workflow "ci"');
  });

  it('loads workflow with skip flag', () => {
    const configWithSkipWorkflow: Config = {
      workflows: [
        {
          workflow: 'deploy',
          skip: true,
          description: 'Skip deployment artifacts',
        },
      ],
    };
    writeFileSync(configPath, JSON.stringify(configWithSkipWorkflow));

    const config = loadConfig(testDir);
    expect(config.workflows![0].skip).toBe(true);
    expect(config.workflows![0].description).toBe('Skip deployment artifacts');
  });
});

describe('mergeConfig with skip patterns', () => {
  it('preserves skip patterns from file config', () => {
    const fileConfig: Config = {
      skipArtifacts: [{ pattern: '.*-screenshots$' }],
    };
    const cliConfig: Partial<Config> = {};

    const merged = mergeConfig(fileConfig, cliConfig);
    expect(merged.skipArtifacts).toBeDefined();
    expect(merged.skipArtifacts).toHaveLength(1);
  });

  it('preserves workflow configs from file config', () => {
    const fileConfig: Config = {
      workflows: [{ workflow: 'ci', skip: true }],
    };
    const cliConfig: Partial<Config> = {};

    const merged = mergeConfig(fileConfig, cliConfig);
    expect(merged.workflows).toBeDefined();
    expect(merged.workflows).toHaveLength(1);
  });
});

describe('loadConfig with expectArtifacts', () => {
  const testDir = join(process.cwd(), 'test-tmp-config-expect');
  const configPath = join(testDir, '.gh-ci-artifacts.json');

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('loads workflow with expectArtifacts', () => {
    const configWithExpect: Config = {
      workflows: [
        {
          workflow: 'ci',
          expectArtifacts: [
            {
              pattern: 'test-results',
              required: true,
              reason: 'Must have test results',
            },
          ],
        },
      ],
    };
    writeFileSync(configPath, JSON.stringify(configWithExpect));

    const config = loadConfig(testDir);
    expect(config.workflows).toBeDefined();
    expect(config.workflows![0].expectArtifacts).toBeDefined();
    expect(config.workflows![0].expectArtifacts).toHaveLength(1);
    expect(config.workflows![0].expectArtifacts![0].pattern).toBe('test-results');
    expect(config.workflows![0].expectArtifacts![0].required).toBe(true);
  });

  it('loads workflow with both skip and expect patterns', () => {
    const configWithBoth: Config = {
      workflows: [
        {
          workflow: 'e2e',
          skipArtifacts: [{ pattern: '.*-videos$' }],
          expectArtifacts: [{ pattern: 'playwright-report' }],
        },
      ],
    };
    writeFileSync(configPath, JSON.stringify(configWithBoth));

    const config = loadConfig(testDir);
    expect(config.workflows![0].skipArtifacts).toHaveLength(1);
    expect(config.workflows![0].expectArtifacts).toHaveLength(1);
  });
});

