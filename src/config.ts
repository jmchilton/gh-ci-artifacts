import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parse as parseYAML } from "yaml";
import type { Config, SkipPattern, ArtifactTypeMapping } from "./types.js";

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

function validateCustomArtifactTypes(
  mappings: ArtifactTypeMapping[],
  context: string,
): void {
  for (const mapping of mappings) {
    try {
      new RegExp(mapping.pattern);
    } catch (error) {
      throw new Error(
        `Invalid regex pattern in ${context}: "${mapping.pattern}" - ${error instanceof Error ? error.message : String(error)}`,
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

      // Validate custom artifact type mappings
      if (config.customArtifactTypes) {
        validateCustomArtifactTypes(
          config.customArtifactTypes,
          "global customArtifactTypes",
        );
      }

      if (config.workflows) {
        for (const workflow of config.workflows) {
          if (workflow.skipArtifacts) {
            validateSkipPatterns(
              workflow.skipArtifacts,
              `workflow "${workflow.workflow}" skipArtifacts`,
            );
          }

          if (workflow.customArtifactTypes) {
            validateCustomArtifactTypes(
              workflow.customArtifactTypes,
              `workflow "${workflow.workflow}" customArtifactTypes`,
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
    customArtifactTypes:
      cliConfig.customArtifactTypes ?? fileConfig.customArtifactTypes,
    extractArtifactTypesFromLogs:
      cliConfig.extractArtifactTypesFromLogs ??
      fileConfig.extractArtifactTypesFromLogs,
    workflows: cliConfig.workflows ?? fileConfig.workflows,
  };
}

/**
 * Sanitize branch name for use in filesystem paths.
 * Replaces slashes and special characters with hyphens.
 */
function sanitizeBranchName(branch: string): string {
  return branch.replace(/[\/\\:\*\?"<>\|]/g, "-").replace(/\s+/g, "-");
}

export function getOutputDir(
  config: Config,
  ref: { pr?: number; branch?: string; remote?: string },
  cwd: string = process.cwd(),
): string {
  const baseDir = config.outputDir ?? join(cwd, ".gh-ci-artifacts");

  // Generate directory name based on ref type
  let dirName: string;
  if (ref.pr !== undefined) {
    dirName = `pr-${ref.pr}`;
  } else if (ref.branch) {
    const sanitized = sanitizeBranchName(ref.branch);
    const remote = ref.remote || "origin";
    dirName = `branch-${remote}-${sanitized}`;
  } else {
    throw new Error("Invalid ref: must provide either pr or branch");
  }

  return join(baseDir, dirName);
}
