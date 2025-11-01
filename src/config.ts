import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Config } from './types.js';

const CONFIG_FILENAME = '.gh-ci-artifacts.json';

export function loadConfig(cwd: string = process.cwd()): Config {
  const configPath = join(cwd, CONFIG_FILENAME);

  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const configContent = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent) as Config;
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
