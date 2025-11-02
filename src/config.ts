import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parse as parseYAML } from "yaml";
import type { Config, SkipPattern } from "./types.js";

const CONFIG_FILENAMES = [
  ".gh-ci-artifacts.json",
  ".gh-ci-artifacts.yml",
  ".gh-ci-artifacts.yaml",
];

function validateSkipPatterns(patterns: SkipPattern[], context: string): void {
  for (const pattern of patterns) {
    try {
      new RegExp(pattern.pattern);
    } catch (error) {
      throw new Error(
        `Invalid regex pattern in ${context}: "${pattern.pattern}" - ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export function loadConfig(cwd: string = process.cwd()): Config {
  // Check for config files in order of preference
  for (const filename of CONFIG_FILENAMES) {
    const configPath = join(cwd, filename);

    if (!existsSync(configPath)) {
      continue;
    }

    try {
      const configContent = readFileSync(configPath, "utf-8");
      const isYAML = filename.endsWith(".yml") || filename.endsWith(".yaml");
      const config = isYAML
        ? (parseYAML(configContent) as Config)
        : (JSON.parse(configContent) as Config);

      // Validate skip patterns
      if (config.skipArtifacts) {
        validateSkipPatterns(config.skipArtifacts, "global skipArtifacts");
      }

      if (config.workflows) {
        for (const workflow of config.workflows) {
          if (workflow.skipArtifacts) {
            validateSkipPatterns(
              workflow.skipArtifacts,
              `workflow "${workflow.workflow}" skipArtifacts`,
            );
          }
        }
      }

      return config;
    } catch (error) {
      throw new Error(
        `Failed to parse ${filename}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {};
}

export function mergeConfig(
  fileConfig: Config,
  cliConfig: Partial<Config>,
): Config {
  return {
    outputDir: cliConfig.outputDir ?? fileConfig.outputDir,
    defaultRepo: cliConfig.defaultRepo ?? fileConfig.defaultRepo,
    maxRetries: cliConfig.maxRetries ?? fileConfig.maxRetries ?? 3,
    retryDelay: cliConfig.retryDelay ?? fileConfig.retryDelay ?? 5,
    pollInterval: cliConfig.pollInterval ?? fileConfig.pollInterval ?? 1800, // 30 minutes
    maxWaitTime: cliConfig.maxWaitTime ?? fileConfig.maxWaitTime ?? 21600, // 6 hours
    skipArtifacts: cliConfig.skipArtifacts ?? fileConfig.skipArtifacts,
    workflows: cliConfig.workflows ?? fileConfig.workflows,
  };
}

export function getOutputDir(
  config: Config,
  prNumber: number,
  cwd: string = process.cwd(),
): string {
  const baseDir = config.outputDir ?? join(cwd, ".gh-ci-artifacts");
  return join(baseDir, String(prNumber));
}
