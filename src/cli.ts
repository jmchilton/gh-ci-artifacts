#!/usr/bin/env node
import { Command } from "commander";
import { existsSync, statSync, renameSync } from "fs";
import { exec } from "child_process";
import { loadConfig, mergeConfig, getOutputDir } from "./config.js";
import { validateGhSetup, getCurrentRepo } from "./utils/gh.js";
import { Logger } from "./utils/logger.js";
import { downloadArtifacts } from "./downloader.js";
import { extractLogs } from "./log-extractor.js";
import { catalogArtifacts } from "./cataloger.js";
import { collectLinterOutputs } from "./linter-collector.js";
import { generateSummary, determineExitCode } from "./summary-generator.js";

const program = new Command();

program
  .name("gh-ci-artifacts")
  .description(
    "Download and parse GitHub Actions CI artifacts and logs for LLM analysis",
  )
  .version("0.1.0")
  .argument("<pr>", "Pull request number", parseInt)
  .option(
    "-r, --repo <owner/repo>",
    "Repository in owner/repo format (defaults to current repo)",
  )
  .option("-o, --output-dir <dir>", "Output directory")
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
  .action(async (pr: number, options) => {
    const logger = new Logger(options.debug);

    try {
      logger.info("Validating GitHub CLI setup...");
      validateGhSetup();

      // Use current repo if not specified
      const targetRepo = options.repo || getCurrentRepo();

      const fileConfig = loadConfig();
      const config = mergeConfig(fileConfig, {
        outputDir: options.outputDir,
        maxRetries: options.maxRetries,
        retryDelay: options.retryDelay,
        pollInterval: options.pollInterval,
        maxWaitTime: options.maxWaitTime,
      });

      const outputDir = getOutputDir(config, pr);

      // Handle existing directory
      if (existsSync(outputDir) && !options.resume && !options.dryRun) {
        const stats = statSync(outputDir);
        const timestamp = stats.birthtime
          .toISOString()
          .replace(/[:.]/g, "-")
          .replace("T", "_")
          .split(".")[0];
        const backupDir = `${outputDir}-${timestamp}`;

        logger.info(`Found existing artifacts for PR #${pr}`);
        logger.info(`Backing up to: ${backupDir}`);
        renameSync(outputDir, backupDir);
      }

      logger.info(`Repository: ${targetRepo}`);
      logger.info(`Pull Request: #${pr}`);
      logger.info(`Output directory: ${outputDir}`);
      logger.info(`Max retries: ${config.maxRetries}`);
      logger.info(`Retry delay: ${config.retryDelay}s`);

      if (options.resume) {
        logger.info("Resume mode enabled");
      }

      if (options.dryRun) {
        logger.info("Dry-run mode: No files will be downloaded");
      }

      logger.info("\n=== Downloading artifacts ===");
      if (!options.includeSuccesses) {
        logger.info(
          "Skipping successful runs (use --include-successes to download all)",
        );
      }
      const result = await downloadArtifacts(
        targetRepo,
        pr,
        outputDir,
        config,
        logger,
        options.resume,
        options.dryRun,
        options.includeSuccesses,
        options.wait,
      );

      logger.info("\n=== Download complete ===");
      logger.info(`Head SHA: ${result.headSha}`);
      logger.info(`Total artifacts processed: ${result.inventory.length}`);

      const successCount = result.inventory.filter(
        (a) => a.status === "success",
      ).length;
      const expiredCount = result.inventory.filter(
        (a) => a.status === "expired",
      ).length;
      const failedCount = result.inventory.filter(
        (a) => a.status === "failed",
      ).length;

      logger.info(`  Success: ${successCount}`);
      logger.info(`  Expired: ${expiredCount}`);
      logger.info(`  Failed: ${failedCount}`);

      // Extract logs for runs without artifacts
      let logResult;
      if (result.runsWithoutArtifacts.length > 0 && !options.dryRun) {
        logger.info(
          `\n=== Extracting logs for ${result.runsWithoutArtifacts.length} runs without artifacts ===`,
        );
        logResult = await extractLogs(
          targetRepo,
          result.runsWithoutArtifacts,
          outputDir,
          logger,
        );

        let totalLogsExtracted = 0;
        logResult.logs.forEach((runLogs) => {
          totalLogsExtracted += runLogs.filter(
            (log) => log.extractionStatus === "success",
          ).length;
        });

        logger.info(`\n=== Log extraction complete ===`);
        logger.info(`Total logs extracted: ${totalLogsExtracted}`);

        // Collect linter outputs from logs
        logger.info("\n=== Collecting linter outputs ===");
        const linterResult = await collectLinterOutputs(
          outputDir,
          logResult.logs,
          logger,
        );

        let totalLinterOutputs = 0;
        linterResult.linterOutputs.forEach((outputs) => {
          totalLinterOutputs += outputs.length;
        });

        logger.info(`\n=== Linter collection complete ===`);
        logger.info(`Total linter outputs extracted: ${totalLinterOutputs}`);
      }

      // Catalog artifacts and convert HTML
      let catalogResult;
      if (!options.dryRun) {
        logger.info("\n=== Cataloging artifacts and converting HTML ===");
        const allRunIds = Array.from(result.runStates.keys());
        catalogResult = await catalogArtifacts(
          outputDir,
          allRunIds,
          result.inventory,
          logger,
        );

        const convertedCount = catalogResult.catalog.filter(
          (c) => c.converted,
        ).length;
        const skippedCount = catalogResult.catalog.filter(
          (c) => c.skipped,
        ).length;

        logger.info(`\n=== Cataloging complete ===`);
        logger.info(
          `Total artifacts cataloged: ${catalogResult.catalog.length}`,
        );
        logger.info(`  HTML converted to JSON: ${convertedCount}`);
        logger.info(`  Binary files skipped: ${skippedCount}`);

        // Generate master summary
        logger.info("\n=== Generating summary ===");
        const summary = generateSummary(
          {
            repo: targetRepo,
            pr,
            headSha: result.headSha,
            inventory: result.inventory,
            runStates: result.runStates,
            logs: logResult?.logs || new Map(),
            catalog: catalogResult.catalog,
            validationResults: result.validationResults,
            workflowRuns: result.workflowRuns,
          },
          outputDir,
        );

        logger.info(`\n=== Complete ===`);
        logger.info(`Status: ${summary.status}`);

        // Report validation results if any
        if (summary.validationResults && summary.validationResults.length > 0) {
          const totalRequiredViolations = summary.validationResults.reduce(
            (sum, v) => sum + v.missingRequired.length,
            0,
          );
          const totalOptionalViolations = summary.validationResults.reduce(
            (sum, v) => sum + v.missingOptional.length,
            0,
          );

          if (totalRequiredViolations > 0) {
            logger.error(
              `Validation: ${totalRequiredViolations} required artifact(s) missing`,
            );
          }
          if (totalOptionalViolations > 0) {
            logger.warn(
              `Validation: ${totalOptionalViolations} optional artifact(s) missing`,
            );
          }
        }

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

        // Exit with appropriate code
        const exitCode = determineExitCode(summary.status);
        process.exit(exitCode);
      }
    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
