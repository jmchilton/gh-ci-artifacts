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
