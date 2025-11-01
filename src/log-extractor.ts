import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { Logger } from './utils/logger.js';
import type { JobLog } from './types.js';
import { getJobsForRun, getJobLogs } from './github/api.js';

export interface LogExtractionResult {
  logs: Map<string, JobLog[]>; // runId -> JobLog[]
}

export async function extractLogs(
  repo: string,
  runIds: string[],
  outputDir: string,
  logger: Logger
): Promise<LogExtractionResult> {
  const logs = new Map<string, JobLog[]>();

  for (let i = 0; i < runIds.length; i++) {
    const runId = runIds[i];
    logger.info(`\nExtracting logs for run ${i + 1}/${runIds.length} (${runId})...`);

    try {
      const jobs = getJobsForRun(repo, runId);
      const failedJobs = jobs.filter(
        job => job.conclusion === 'failure' || job.status === 'completed'
      );

      logger.info(`  Found ${jobs.length} jobs, ${failedJobs.length} failed/completed`);

      const runLogs: JobLog[] = [];

      for (const job of failedJobs) {
        try {
          logger.debug(`  Fetching logs for job: ${job.name}`);

          const logContent = getJobLogs(repo, job.id);

          // Save log file
          const logDir = join(outputDir, 'raw', runId);
          mkdirSync(logDir, { recursive: true });

          const sanitizedJobName = sanitizeFilename(job.name);
          const logFilePath = join(logDir, `${sanitizedJobName}.log`);
          writeFileSync(logFilePath, logContent);

          logger.debug(`  Saved log to ${logFilePath}`);

          runLogs.push({
            jobName: job.name,
            extractionStatus: 'success',
            logFile: logFilePath,
          });
        } catch (error) {
          logger.error(
            `  Failed to extract logs for job ${job.name}: ${error instanceof Error ? error.message : String(error)}`
          );

          runLogs.push({
            jobName: job.name,
            extractionStatus: 'failed',
          });
        }
      }

      logs.set(runId, runLogs);
    } catch (error) {
      logger.error(
        `Failed to fetch jobs for run ${runId}: ${error instanceof Error ? error.message : String(error)}`
      );
      logs.set(runId, []);
    }
  }

  return { logs };
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
