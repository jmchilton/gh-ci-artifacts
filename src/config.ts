import { readFileSync, existsSync } from "fs";
import { join, isAbsolute } from "path";
import { parse as parseYAML } from "yaml";
import type { Config, SkipPattern, ArtifactTypeMapping } from "./types.js";

export const CONFIG_FILENAMES = [
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

export function loadConfig(
  cwd: string = process.cwd(),
  configPath?: string,
): Config {
  // If explicit path provided, use it (absolute or relative to cwd)
  if (configPath) {
    const absolutePath = isAbsolute(configPath) ? configPath : join(cwd, configPath);

    if (!existsSync(absolutePath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    try {
      const configContent = readFileSync(absolutePath, "utf-8");
      const isYAML =
        configPath.endsWith(".yml") || configPath.endsWith(".yaml");
      const config = isYAML
        ? (parseYAML(configContent) as Config)
        : (JSON.parse(configContent) as Config);

      validateConfig(config);
      return config;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Config file")) {
        throw error;
      }
      throw new Error(
        `Failed to parse ${configPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Check for config files in order of preference
  for (const filename of CONFIG_FILENAMES) {
    const filepath = join(cwd, filename);

    if (!existsSync(filepath)) {
      continue;
    }

    try {
      const configContent = readFileSync(filepath, "utf-8");
      const isYAML = filename.endsWith(".yml") || filename.endsWith(".yaml");
      const config = isYAML
        ? (parseYAML(configContent) as Config)
        : (JSON.parse(configContent) as Config);

      validateConfig(config);
      return config;
    } catch (error) {
      throw new Error(
        `Failed to parse ${filename}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {};
}

function validateConfig(config: Config): void {
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

/**
 * Find and load a config file, returning the path, format, and raw parsed content.
 * This is useful for tools that need to validate the config before using it.
 *
 * @param explicitPath - Optional explicit path to config file
 * @param cwd - Working directory to search for config files (defaults to process.cwd())
 * @returns Object with path, format, and parsed content
 * @throws Error if config file not found or cannot be parsed
 */
export function findAndLoadConfigFile(
  explicitPath?: string,
  cwd: string = process.cwd(),
): { path: string; format: "json" | "yaml"; content: unknown } {
  // If explicit path provided, use it
  if (explicitPath) {
    if (!existsSync(explicitPath)) {
      throw new Error(`Config file not found: ${explicitPath}`);
    }

    const configContent = readFileSync(explicitPath, "utf-8");
    const format: "json" | "yaml" =
      explicitPath.endsWith(".yaml") || explicitPath.endsWith(".yml")
        ? "yaml"
        : "json";

    try {
      const content =
        format === "yaml" ? parseYAML(configContent) : JSON.parse(configContent);
      return { path: explicitPath, format, content };
    } catch (error) {
      throw new Error(
        `Failed to parse config file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Search for config files in order of preference
  for (const filename of CONFIG_FILENAMES) {
    const configPath = join(cwd, filename);

    if (!existsSync(configPath)) {
      continue;
    }

    try {
      const configContent = readFileSync(configPath, "utf-8");
      const format: "json" | "yaml" =
        filename.endsWith(".yml") || filename.endsWith(".yaml")
          ? "yaml"
          : "json";

      const content =
        format === "yaml" ? parseYAML(configContent) : JSON.parse(configContent);
      return { path: configPath, format, content };
    } catch (error) {
      throw new Error(
        `Failed to parse ${filename}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new Error(
    `No config file found. Searched for: ${CONFIG_FILENAMES.join(", ")}`,
  );
}
