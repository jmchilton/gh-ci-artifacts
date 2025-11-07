import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import type { Logger } from "./utils/logger.js";
import type { JobLog, ArtifactExtractionConfig, LinterOutput } from "./types.js";
import { extract } from "artifact-detective";

export interface ArtifactCollectionResult {
  artifactOutputs: Map<string, LinterOutput[]>; // runId -> LinerOutput[]
  foundArtifactTypes: Map<string, Set<string>>; // runId -> Set of found artifact types
}

export async function collectArtifactsFromLogs(
  outputDir: string,
  logsByRun: Map<string, JobLog[]>,
  extractionConfigs: ArtifactExtractionConfig[] | undefined,
  logger: Logger,
): Promise<ArtifactCollectionResult> {
  const artifactOutputs = new Map<string, LinterOutput[]>();
  const foundArtifactTypes = new Map<string, Set<string>>();

  // If no types specified, skip extraction
  if (!extractionConfigs || extractionConfigs.length === 0) {
    logger.debug("No artifact types configured for extraction from logs");
    return { artifactOutputs, foundArtifactTypes };
  }

  for (const [runId, logs] of logsByRun.entries()) {
    logger.debug(`\nProcessing artifacts for run ${runId}...`);

    const runArtifactOutputs: LinterOutput[] = [];
    const runFoundTypes = new Set<string>();

    for (const log of logs) {
      if (!log.logFile || log.extractionStatus !== "success") {
        continue;
      }

      try {
        const logContent = readFileSync(log.logFile, "utf-8");

        // Try each configured artifact type
        let foundMatch = false;
        for (const config of extractionConfigs) {
          // Compile regex patterns from strings if provided
          const extractorConfig = config.extractorConfig
            ? {
                startMarker: config.extractorConfig.startMarker
                  ? new RegExp(config.extractorConfig.startMarker)
                  : undefined,
                endMarker: config.extractorConfig.endMarker
                  ? new RegExp(config.extractorConfig.endMarker)
                  : undefined,
                includeEndMarker: config.extractorConfig.includeEndMarker,
              }
            : undefined;

          // Use new unified extract() API
          const result = extract(config.type, logContent, {
            config: extractorConfig,
            normalize: config.toJson,
          });

          if (result) {
            const { content: artifactOutput, artifact, validationResult } = result;
            logger.debug(
              `  Detected ${config.type} in job: ${log.jobName}${config.toJson ? " (normalized)" : ""}`,
            );
            if (artifact) {
              logger.debug(
                `    ${artifact.shortDescription} (${artifact.fileExtension || "txt"})`,
              );
              if (artifact.toolUrl) {
                logger.debug(`    Tool: ${artifact.toolUrl}`);
              }
            }
            if (validationResult) {
              if (validationResult.valid) {
                logger.debug(`    Validation: ✓ valid`);
              } else {
                logger.warn(
                  `    Validation: ✗ INVALID - ${validationResult.error}`,
                );
              }
            }

            // Save artifact output
            const artifactDir = join(outputDir, "artifacts", runId);
            mkdirSync(artifactDir, { recursive: true });

            const ext = artifact.fileExtension || "txt";
            const fileName = `${sanitizeJobName(log.jobName)}-${config.type}.${ext}`;
            const filePath = join(artifactDir, fileName);

            writeFileSync(filePath, artifactOutput);

            runArtifactOutputs.push({
              detectedType: `${config.type}-${ext}`,
              filePath,
              artifact,
              validation: validationResult,
            });

            logger.debug(`    Saved artifact output to ${filePath}`);

            // Track found artifact type
            runFoundTypes.add(config.type);

            // Update job log with artifact outputs
            log.linterOutputs = log.linterOutputs || [];
            log.linterOutputs.push({
              detectedType: `${config.type}-${ext}`,
              filePath,
              artifact,
              validation: validationResult,
            });

            foundMatch = true;
            break; // Stop after first match for this log
          }
        }

        if (!foundMatch) {
          logger.debug(
            `  No configured artifact types detected in job: ${log.jobName}`,
          );
        }
      } catch (error) {
        logger.error(
          `  Failed to process artifact for ${log.jobName}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (runArtifactOutputs.length > 0) {
      artifactOutputs.set(runId, runArtifactOutputs);
    }

    if (runFoundTypes.size > 0) {
      foundArtifactTypes.set(runId, runFoundTypes);
    }
  }

  return { artifactOutputs, foundArtifactTypes };
}

function sanitizeJobName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
