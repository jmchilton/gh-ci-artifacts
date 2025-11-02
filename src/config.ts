import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Config, SkipPattern } from './types.js';

const CONFIG_FILENAME = '.gh-ci-artifacts.json';

function validateSkipPatterns(patterns: SkipPattern[], context: string): void {
  for (const pattern of patterns) {
    try {
      new RegExp(pattern.pattern);
    } catch (error) {
      throw new Error(
        `Invalid regex pattern in ${context}: "${pattern.pattern}" - ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

export function loadConfig(cwd: string = process.cwd()): Config {
  const configPath = join(cwd, CONFIG_FILENAME);

  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const configContent = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent) as Config;
    
    // Validate skip patterns
    if (config.skipArtifacts) {
      validateSkipPatterns(config.skipArtifacts, 'global skipArtifacts');
    }
    
    if (config.workflows) {
      for (const workflow of config.workflows) {
        if (workflow.skipArtifacts) {
          validateSkipPatterns(
            workflow.skipArtifacts,
            `workflow "${workflow.workflow}" skipArtifacts`
          );
        }
      }
    }
    
    return config;
  } catch (error) {
    throw new Error(
      `Failed to parse ${CONFIG_FILENAME}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function mergeConfig(
  fileConfig: Config,
  cliConfig: Partial<Config>
): Config {
  return {
    outputDir: cliConfig.outputDir ?? fileConfig.outputDir,
    defaultRepo: cliConfig.defaultRepo ?? fileConfig.defaultRepo,
    maxRetries: cliConfig.maxRetries ?? fileConfig.maxRetries ?? 3,
    retryDelay: cliConfig.retryDelay ?? fileConfig.retryDelay ?? 5,
    skipArtifacts: cliConfig.skipArtifacts ?? fileConfig.skipArtifacts,
    workflows: cliConfig.workflows ?? fileConfig.workflows,
  };
}

export function getOutputDir(
  config: Config,
  prNumber: number,
  cwd: string = process.cwd()
): string {
  const baseDir = config.outputDir ?? join(cwd, '.gh-ci-artifacts');
  return join(baseDir, String(prNumber));
}
