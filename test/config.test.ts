import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { loadConfig, mergeConfig, getOutputDir } from "../src/config.js";
import type { Config } from "../src/types.js";

describe("loadConfig", () => {
  const testDir = join(process.cwd(), "test-tmp-config");
  const configPathJson = join(testDir, ".gh-ci-artifacts.json");
  const configPathYml = join(testDir, ".gh-ci-artifacts.yml");
  const configPathYaml = join(testDir, ".gh-ci-artifacts.yaml");

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

  it("returns empty config when no config file exists", () => {
    const config = loadConfig(testDir);
    expect(config).toEqual({});
  });

  it("loads valid config file", () => {
    const validConfig: Config = {
      outputDir: "/custom/output",
      defaultRepo: "owner/repo",
      maxRetries: 5,
      retryDelay: 10,
    };
    writeFileSync(configPathJson, JSON.stringify(validConfig));

    const config = loadConfig(testDir);
    expect(config).toEqual(validConfig);
  });

  it("throws on invalid JSON", () => {
    writeFileSync(configPathJson, "{ invalid json }");

    expect(() => loadConfig(testDir)).toThrow("Failed to parse");
  });

  it("loads partial config", () => {
    const partialConfig: Config = {
      outputDir: "/custom/output",
    };
    writeFileSync(configPathJson, JSON.stringify(partialConfig));

    const config = loadConfig(testDir);
    expect(config).toEqual(partialConfig);
  });

  it("loads valid .yml config file", () => {
    const yamlContent = `outputDir: /custom/output
defaultRepo: owner/repo
maxRetries: 5
retryDelay: 10`;
    writeFileSync(configPathYml, yamlContent);

    const config = loadConfig(testDir);
    expect(config).toEqual({
      outputDir: "/custom/output",
      defaultRepo: "owner/repo",
      maxRetries: 5,
      retryDelay: 10,
    });
  });

  it("loads valid .yaml config file", () => {
    const yamlContent = `outputDir: /yaml/output
maxRetries: 7`;
    writeFileSync(configPathYaml, yamlContent);

    const config = loadConfig(testDir);
    expect(config).toEqual({
      outputDir: "/yaml/output",
      maxRetries: 7,
    });
  });

  it("prefers .json over .yml when both exist", () => {
    const jsonConfig: Config = { outputDir: "/json/output" };
    const yamlContent = `outputDir: /yaml/output`;

    writeFileSync(configPathJson, JSON.stringify(jsonConfig));
    writeFileSync(configPathYml, yamlContent);

    const config = loadConfig(testDir);
    expect(config.outputDir).toBe("/json/output");
  });

  it("loads .yml when only .yml exists", () => {
    const yamlContent = `outputDir: /yml/output`;
    writeFileSync(configPathYml, yamlContent);

    const config = loadConfig(testDir);
    expect(config.outputDir).toBe("/yml/output");
  });

  it("prefers .yml over .yaml when both exist", () => {
    const ymlContent = `outputDir: /yml/output`;
    const yamlContent = `outputDir: /yaml/output`;

    writeFileSync(configPathYml, ymlContent);
    writeFileSync(configPathYaml, yamlContent);

    const config = loadConfig(testDir);
    expect(config.outputDir).toBe("/yml/output");
  });

  it("throws on invalid YAML", () => {
    writeFileSync(configPathYml, "invalid:\n\t\tyaml: [unclosed");

    expect(() => loadConfig(testDir)).toThrow("Failed to parse");
  });
});

describe("mergeConfig", () => {
  it("CLI args override file config", () => {
    const fileConfig: Config = {
      outputDir: "/file/output",
      maxRetries: 3,
    };
    const cliConfig: Partial<Config> = {
      outputDir: "/cli/output",
    };

    const merged = mergeConfig(fileConfig, cliConfig);
    expect(merged.outputDir).toBe("/cli/output");
    expect(merged.maxRetries).toBe(3);
  });

  it("applies defaults for missing values", () => {
    const fileConfig: Config = {};
    const cliConfig: Partial<Config> = {};

    const merged = mergeConfig(fileConfig, cliConfig);
    expect(merged.maxRetries).toBe(3);
    expect(merged.retryDelay).toBe(5);
  });

  it("file config used when CLI not provided", () => {
    const fileConfig: Config = {
      defaultRepo: "owner/repo",
      maxRetries: 10,
    };
    const cliConfig: Partial<Config> = {};

    const merged = mergeConfig(fileConfig, cliConfig);
    expect(merged.defaultRepo).toBe("owner/repo");
    expect(merged.maxRetries).toBe(10);
  });
});

describe("getOutputDir", () => {
  it("uses config outputDir if provided", () => {
    const config: Config = {
      outputDir: "/custom/output",
    };

    const outputDir = getOutputDir(config, { pr: 123 }, "/cwd");
    expect(outputDir).toBe("/custom/output/pr-123");
  });

  it("uses default .gh-ci-artifacts when no config", () => {
    const config: Config = {};

    const outputDir = getOutputDir(config, { pr: 456 }, "/cwd");
    expect(outputDir).toBe("/cwd/.gh-ci-artifacts/pr-456");
  });

  it("appends PR number to output path", () => {
    const config: Config = {
      outputDir: "/base",
    };

    const outputDir = getOutputDir(config, { pr: 789 }, "/cwd");
    expect(outputDir).toBe("/base/pr-789");
  });

  it("uses branch name with remote in output path", () => {
    const config: Config = {
      outputDir: "/base",
    };

    const outputDir = getOutputDir(
      config,
      { branch: "main", remote: "origin" },
      "/cwd",
    );
    expect(outputDir).toBe("/base/branch-origin-main");
  });

  it("sanitizes branch names for output path", () => {
    const config: Config = {
      outputDir: "/base",
    };

    const outputDir = getOutputDir(
      config,
      { branch: "feature/my-branch", remote: "origin" },
      "/cwd",
    );
    expect(outputDir).toBe("/base/branch-origin-feature-my-branch");
  });
});

describe("loadConfig with skip patterns", () => {
  const testDir = join(process.cwd(), "test-tmp-config-skip");
  const configPath = join(testDir, ".gh-ci-artifacts.json");

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

  it("loads config with global skip patterns", () => {
    const configWithSkip: Config = {
      skipArtifacts: [{ pattern: ".*-screenshots$", reason: "No screenshots" }],
    };
    writeFileSync(configPath, JSON.stringify(configWithSkip));

    const config = loadConfig(testDir);
    expect(config.skipArtifacts).toBeDefined();
    expect(config.skipArtifacts).toHaveLength(1);
    expect(config.skipArtifacts![0].pattern).toBe(".*-screenshots$");
  });

  it("loads config with workflow configurations", () => {
    const configWithWorkflows: Config = {
      workflows: [
        {
          workflow: "ci",
          skipArtifacts: [{ pattern: ".*-traces$" }],
        },
      ],
    };
    writeFileSync(configPath, JSON.stringify(configWithWorkflows));

    const config = loadConfig(testDir);
    expect(config.workflows).toBeDefined();
    expect(config.workflows).toHaveLength(1);
    expect(config.workflows![0].workflow).toBe("ci");
  });

  it("validates regex patterns in global skip", () => {
    const invalidConfig = {
      skipArtifacts: [{ pattern: "[invalid(regex" }],
    };
    writeFileSync(configPath, JSON.stringify(invalidConfig));

    expect(() => loadConfig(testDir)).toThrow("Invalid regex pattern");
  });

  it("validates regex patterns in workflow skip", () => {
    const invalidConfig = {
      workflows: [
        {
          workflow: "ci",
          skipArtifacts: [{ pattern: "[invalid" }],
        },
      ],
    };
    writeFileSync(configPath, JSON.stringify(invalidConfig));

    expect(() => loadConfig(testDir)).toThrow("Invalid regex pattern");
    expect(() => loadConfig(testDir)).toThrow('workflow "ci"');
  });

  it("loads workflow with skip flag", () => {
    const configWithSkipWorkflow: Config = {
      workflows: [
        {
          workflow: "deploy",
          skip: true,
          description: "Skip deployment artifacts",
        },
      ],
    };
    writeFileSync(configPath, JSON.stringify(configWithSkipWorkflow));

    const config = loadConfig(testDir);
    expect(config.workflows![0].skip).toBe(true);
    expect(config.workflows![0].description).toBe("Skip deployment artifacts");
  });
});

describe("mergeConfig with skip patterns", () => {
  it("preserves skip patterns from file config", () => {
    const fileConfig: Config = {
      skipArtifacts: [{ pattern: ".*-screenshots$" }],
    };
    const cliConfig: Partial<Config> = {};

    const merged = mergeConfig(fileConfig, cliConfig);
    expect(merged.skipArtifacts).toBeDefined();
    expect(merged.skipArtifacts).toHaveLength(1);
  });

  it("preserves workflow configs from file config", () => {
    const fileConfig: Config = {
      workflows: [{ workflow: "ci", skip: true }],
    };
    const cliConfig: Partial<Config> = {};

    const merged = mergeConfig(fileConfig, cliConfig);
    expect(merged.workflows).toBeDefined();
    expect(merged.workflows).toHaveLength(1);
  });
});

describe("loadConfig with expectArtifacts", () => {
  const testDir = join(process.cwd(), "test-tmp-config-expect");
  const configPath = join(testDir, ".gh-ci-artifacts.json");

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

  it("loads workflow with expectArtifacts", () => {
    const configWithExpect: Config = {
      workflows: [
        {
          workflow: "ci",
          expectArtifacts: [
            {
              pattern: "test-results",
              required: true,
              reason: "Must have test results",
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
    expect(config.workflows![0].expectArtifacts![0].pattern).toBe(
      "test-results",
    );
    expect(config.workflows![0].expectArtifacts![0].required).toBe(true);
  });

  it("loads workflow with both skip and expect patterns", () => {
    const configWithBoth: Config = {
      workflows: [
        {
          workflow: "e2e",
          skipArtifacts: [{ pattern: ".*-videos$" }],
          expectArtifacts: [{ pattern: "playwright-report" }],
        },
      ],
    };
    writeFileSync(configPath, JSON.stringify(configWithBoth));

    const config = loadConfig(testDir);
    expect(config.workflows![0].skipArtifacts).toHaveLength(1);
    expect(config.workflows![0].expectArtifacts).toHaveLength(1);
  });
});

describe("loadConfig with explicit path", () => {
  const testDir = join(process.cwd(), "test-tmp-config-explicit");
  const configPath = join(testDir, "custom-config.json");
  const subdir = join(testDir, "subdir");
  const subdirConfigPath = join(subdir, "nested.json");

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
    mkdirSync(subdir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it("loads config from explicit absolute path", () => {
    const config: Config = { outputDir: "/explicit/output" };
    writeFileSync(configPath, JSON.stringify(config));

    const loaded = loadConfig(testDir, configPath);
    expect(loaded.outputDir).toBe("/explicit/output");
  });

  it("loads config from explicit relative path", () => {
    const config: Config = { maxRetries: 7 };
    writeFileSync(configPath, JSON.stringify(config));

    const loaded = loadConfig(testDir, "custom-config.json");
    expect(loaded.maxRetries).toBe(7);
  });

  it("loads config from nested relative path", () => {
    const config: Config = { defaultRepo: "test/repo" };
    writeFileSync(subdirConfigPath, JSON.stringify(config));

    const loaded = loadConfig(testDir, "subdir/nested.json");
    expect(loaded.defaultRepo).toBe("test/repo");
  });

  it("loads YAML from explicit path", () => {
    const yamlConfigPath = join(testDir, "custom.yml");
    writeFileSync(yamlConfigPath, "outputDir: /yaml/output\nmaxRetries: 9");

    const loaded = loadConfig(testDir, "custom.yml");
    expect(loaded.outputDir).toBe("/yaml/output");
    expect(loaded.maxRetries).toBe(9);
  });

  it("throws when explicit path does not exist", () => {
    expect(() => loadConfig(testDir, "nonexistent.json")).toThrow(
      "Config file not found: nonexistent.json",
    );
  });

  it("throws when explicit path has invalid JSON", () => {
    writeFileSync(configPath, "{ invalid json }");

    expect(() => loadConfig(testDir, "custom-config.json")).toThrow(
      "Failed to parse custom-config.json",
    );
  });

  it("explicit path takes precedence over default names", () => {
    const customConfig: Config = { outputDir: "/custom" };
    const defaultConfig: Config = { outputDir: "/default" };

    writeFileSync(configPath, JSON.stringify(customConfig));
    writeFileSync(
      join(testDir, ".gh-ci-artifacts.json"),
      JSON.stringify(defaultConfig),
    );

    const loaded = loadConfig(testDir, "custom-config.json");
    expect(loaded.outputDir).toBe("/custom");
  });

  it("validates patterns in explicitly loaded config", () => {
    const configWithBadPattern: Config = {
      skipArtifacts: [{ pattern: "[invalid(regex" }],
    };
    writeFileSync(configPath, JSON.stringify(configWithBadPattern));

    expect(() => loadConfig(testDir, "custom-config.json")).toThrow(
      "Invalid regex pattern",
    );
  });
});
