#!/usr/bin/env node
import { Command } from 'commander';
import { loadConfig, mergeConfig, getOutputDir } from './config.js';
import { validateGhSetup } from './utils/gh.js';
import { Logger } from './utils/logger.js';

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

      logger.info('\n=== Phase 1: CLI scaffold complete ===');
      logger.info('Artifact download not yet implemented.');

    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
