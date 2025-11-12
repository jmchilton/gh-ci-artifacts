#!/usr/bin/env node
import { Command } from "commander";
import { existsSync, statSync, renameSync, readFileSync } from "fs";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { loadConfig, mergeConfig, getOutputDir } from "./config.js";
import { validateGhSetup, getCurrentRepo } from "./utils/gh.js";
import { Logger } from "./utils/logger.js";
import { runAction } from "./action.js";
import type { Config } from "./types.js";

// Read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8"),
);
const version = packageJson.version;

const program = new Command();

program
  .name("gh-ci-artifacts")
  .description(
    "Download and parse GitHub Actions CI artifacts and logs for LLM analysis",
  )
  .version(version)
  .argument("<ref>", "Pull request number or branch name")
  .option(
    "-r, --repo <owner/repo>",
    "Repository in owner/repo format (defaults to current repo)",
  )
  .option("-o, --output-dir <dir>", "Output directory")
  .option(
    "-c, --config <path>",
    "Path to config file (absolute or relative to cwd)",
  )
  .option(
    "--remote <name>",
    "Git remote name for branch mode (default: origin)",
  )
  .option("--max-retries <count>", "Maximum retry attempts", parseInt)
  .option("--retry-delay <seconds>", "Retry delay in seconds", parseInt)
  .option(
    "--resume",
    "Resume incomplete/failed downloads (without this, existing artifacts are backed up)",
  )
  .option(
    "--include-successes",
    "Include artifacts from successful runs (by default, only failed/cancelled runs)",
  )
  .option(
    "--wait",
    "Wait for in-progress workflows to complete, polling periodically",
  )
  .option(
    "--poll-interval <seconds>",
    "Seconds between polls when waiting (default: 1800 = 30 min)",
    parseInt,
  )
  .option(
    "--max-wait-time <seconds>",
    "Maximum seconds to wait for completion (default: 21600 = 6 hours)",
    parseInt,
  )
  .option("--open", "Open the generated HTML viewer in default browser")
  .option("--debug", "Enable debug logging")
  .option("--dry-run", "Show what would be downloaded without downloading")
  .action(async (ref: string, options) => {
    const logger = new Logger(options.debug);

    try {
      logger.info("Validating GitHub CLI setup...");
      validateGhSetup();

      // Detect if ref is a PR number (all digits) or branch name
      const isPR = /^\d+$/.test(ref);
      const prNumber = isPR ? parseInt(ref) : undefined;
      const branchName = !isPR ? ref : undefined;
      const remoteName = options.remote || "origin";

      // Use current repo if not specified
      const targetRepo = options.repo || getCurrentRepo();

      const fileConfig = loadConfig(process.cwd(), options.config);
      const config = mergeConfig(fileConfig, {
        outputDir: options.outputDir,
        maxRetries: options.maxRetries,
        retryDelay: options.retryDelay,
        pollInterval: options.pollInterval,
        maxWaitTime: options.maxWaitTime,
      });

      // Build ref object for output directory naming
      const refObj = isPR
        ? { pr: prNumber }
        : { branch: branchName, remote: remoteName };

      const outputDir = getOutputDir(config, refObj);

      // Handle existing directory
      if (existsSync(outputDir) && !options.resume && !options.dryRun) {
        const stats = statSync(outputDir);
        const timestamp = stats.birthtime
          .toISOString()
          .replace(/[:.]/g, "-")
          .replace("T", "_")
          .split(".")[0];
        const backupDir = `${outputDir}-${timestamp}`;

        const refDisplay = isPR ? `PR #${prNumber}` : `branch '${branchName}'`;
        logger.info(`Found existing artifacts for ${refDisplay}`);
        logger.info(`Backing up to: ${backupDir}`);
        renameSync(outputDir, backupDir);
      }

      logger.info(`Repository: ${targetRepo}`);
      if (isPR) {
        logger.info(`Pull Request: #${prNumber}`);
      } else {
        logger.info(`Branch: ${branchName}`);
        logger.info(`Remote: ${remoteName}`);
      }
      logger.info(`Output directory: ${outputDir}`);
      logger.info(`Max retries: ${config.maxRetries}`);
      logger.info(`Retry delay: ${config.retryDelay}s`);

      if (options.resume) {
        logger.info("Resume mode enabled");
      }

      if (options.dryRun) {
        logger.info("Dry-run mode: No files will be downloaded");
      }

      const { summary, exitCode } = await runAction(
        targetRepo,
        isPR ? prNumber! : undefined,
        branchName,
        remoteName,
        outputDir,
        config,
        logger,
        {
          resume: options.resume,
          dryRun: options.dryRun,
          includeSuccesses: options.includeSuccesses,
          wait: options.wait,
          repoExplicitlyProvided: !!options.repo,
        },
      );

      if (!options.dryRun && summary) {
        logger.info(`Summary saved to: ${outputDir}/summary.json`);
        logger.info(`Catalog saved to: ${outputDir}/catalog.json`);
        logger.info(`Inventory saved to: ${outputDir}/artifacts.json`);
        logger.info(`HTML viewer saved to: ${outputDir}/index.html`);

        // Open HTML in browser if requested
        if (options.open) {
          const htmlPath = `${outputDir}/index.html`;
          logger.info(`\nOpening ${htmlPath} in browser...`);

          const platform = process.platform;
          const openCommand =
            platform === "darwin"
              ? "open"
              : platform === "win32"
                ? "start"
                : "xdg-open"; // Linux

          exec(`${openCommand} "${htmlPath}"`, (error) => {
            if (error) {
              logger.warn(`Failed to open browser: ${error.message}`);
              logger.info(`Please manually open: ${htmlPath}`);
            }
          });
        } else {
          logger.info(
            `\nOpen ${outputDir}/index.html in your browser to explore results`,
          );
        }
      }

      process.exit(exitCode);
    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
