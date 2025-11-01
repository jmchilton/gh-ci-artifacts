#!/usr/bin/env node
import { Command } from 'commander';
import { loadConfig, mergeConfig, getOutputDir } from './config.js';
import { validateGhSetup } from './utils/gh.js';
import { Logger } from './utils/logger.js';
import { downloadArtifacts } from './downloader.js';
import { extractLogs } from './log-extractor.js';
import { catalogArtifacts } from './cataloger.js';

const program = new Command();

program
  .name('gh-ci-artifacts')
  .description('Download and parse GitHub Actions CI artifacts and logs for LLM analysis')
  .version('0.1.0')
  .argument('<repo>', 'Repository in owner/repo format')
  .argument('<pr>', 'Pull request number', parseInt)
  .option('-o, --output-dir <dir>', 'Output directory')
  .option('--max-retries <count>', 'Maximum retry attempts', parseInt)
  .option('--retry-delay <seconds>', 'Retry delay in seconds', parseInt)
  .option('--resume', 'Resume incomplete/failed downloads')
  .option('--debug', 'Enable debug logging')
  .option('--dry-run', 'Show what would be downloaded without downloading')
  .action(async (repo: string, pr: number, options) => {
    const logger = new Logger(options.debug);

    try {
      logger.info('Validating GitHub CLI setup...');
      validateGhSetup();

      const fileConfig = loadConfig();
      const config = mergeConfig(fileConfig, {
        outputDir: options.outputDir,
        maxRetries: options.maxRetries,
        retryDelay: options.retryDelay,
      });

      const outputDir = getOutputDir(config, pr);

      logger.info(`Repository: ${repo}`);
      logger.info(`Pull Request: #${pr}`);
      logger.info(`Output directory: ${outputDir}`);
      logger.info(`Max retries: ${config.maxRetries}`);
      logger.info(`Retry delay: ${config.retryDelay}s`);

      if (options.resume) {
        logger.info('Resume mode enabled');
      }

      if (options.dryRun) {
        logger.info('Dry-run mode: No files will be downloaded');
      }

      logger.info('\n=== Downloading artifacts ===');
      const result = await downloadArtifacts(
        repo,
        pr,
        outputDir,
        config,
        logger,
        options.resume,
        options.dryRun
      );

      logger.info('\n=== Download complete ===');
      logger.info(`Head SHA: ${result.headSha}`);
      logger.info(`Total artifacts processed: ${result.inventory.length}`);

      const successCount = result.inventory.filter(a => a.status === 'success').length;
      const expiredCount = result.inventory.filter(a => a.status === 'expired').length;
      const failedCount = result.inventory.filter(a => a.status === 'failed').length;

      logger.info(`  Success: ${successCount}`);
      logger.info(`  Expired: ${expiredCount}`);
      logger.info(`  Failed: ${failedCount}`);

      // Extract logs for runs without artifacts
      if (result.runsWithoutArtifacts.length > 0 && !options.dryRun) {
        logger.info(`\n=== Extracting logs for ${result.runsWithoutArtifacts.length} runs without artifacts ===`);
        const logResult = await extractLogs(
          repo,
          result.runsWithoutArtifacts,
          outputDir,
          logger
        );

        let totalLogsExtracted = 0;
        logResult.logs.forEach(runLogs => {
          totalLogsExtracted += runLogs.filter(log => log.extractionStatus === 'success').length;
        });

        logger.info(`\n=== Log extraction complete ===`);
        logger.info(`Total logs extracted: ${totalLogsExtracted}`);
      }

      // Catalog artifacts and convert HTML
      if (!options.dryRun) {
        logger.info('\n=== Cataloging artifacts and converting HTML ===');
        const allRunIds = Array.from(result.runStates.keys());
        const catalogResult = await catalogArtifacts(outputDir, allRunIds, logger);

        const convertedCount = catalogResult.catalog.filter(c => c.converted).length;
        const skippedCount = catalogResult.catalog.filter(c => c.skipped).length;

        logger.info(`\n=== Cataloging complete ===`);
        logger.info(`Total artifacts cataloged: ${catalogResult.catalog.length}`);
        logger.info(`  HTML converted to JSON: ${convertedCount}`);
        logger.info(`  Binary files skipped: ${skippedCount}`);
      }

    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
