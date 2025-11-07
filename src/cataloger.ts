import { readdirSync, statSync, mkdirSync, writeFileSync } from "fs";
import { join, basename, extname } from "path";
import type { Logger } from "./utils/logger.js";
import type {
  ArtifactInventoryItem,
  CatalogEntry,
  ArtifactTypeMapping,
} from "./types.js";
import {
  canConvertToJSON,
  convertToJSON,
  detectArtifactType,
  isJSON,
} from "artifact-detective";

export interface CatalogResult {
  catalog: CatalogEntry[];
}

export async function catalogArtifacts(
  outputDir: string,
  runIds: string[],
  inventory: ArtifactInventoryItem[],
  logger: Logger,
  customArtifactTypes?: ArtifactTypeMapping[],
): Promise<CatalogResult> {
  const catalog: CatalogEntry[] = [];
  const rawDir = join(outputDir, "raw");
  const convertedDir = join(outputDir, "converted");

  for (const runId of runIds) {
    const runDir = join(rawDir, runId);

    try {
      if (!statSync(runDir).isDirectory()) {
        continue;
      }
    } catch {
      // Directory doesn't exist, skip
      continue;
    }

    logger.debug(`Cataloging artifacts in run ${runId}...`);

    // Get all artifact directories (now named artifact-<id>)
    const artifactDirs = readdirSync(runDir).filter((name) => {
      try {
        return statSync(join(runDir, name)).isDirectory();
      } catch {
        return false;
      }
    });

    for (const dirName of artifactDirs) {
      // Parse artifact ID from directory name (format: artifact-<id>)
      const match = dirName.match(/^artifact-(\d+)$/);
      if (!match) {
        logger.warn(`Skipping directory with unexpected name: ${dirName}`);
        continue;
      }

      const artifactId = parseInt(match[1], 10);

      // Find artifact info from inventory
      const artifactInfo = inventory.find(
        (item) => item.runId === runId && item.artifactId === artifactId,
      );

      if (!artifactInfo) {
        logger.warn(
          `Could not find inventory entry for artifact ${artifactId} in run ${runId}`,
        );
        continue;
      }

      const artifactName = artifactInfo.artifactName;
      const artifactDir = join(runDir, dirName);
      const files = getAllFiles(artifactDir);

      for (const filePath of files) {
        const detection = detectArtifactType(filePath, { validate: true });

        // Apply custom artifact type mapping if detected type is unknown
        const finalType = applyCustomArtifactType(
          filePath,
          detection.detectedType,
          customArtifactTypes,
        ) as typeof detection.detectedType;

        if (detection.isBinary) {
          // Skip binary files
          catalog.push({
            artifactName,
            artifactId,
            runId,
            detectedType: finalType,
            originalFormat: detection.originalFormat,
            filePath,
            skipped: true,
          });
          continue;
        }

        // Log artifact descriptor and validation info
        if (detection.artifact) {
          logger.debug(
            `  ${basename(filePath)}: ${detection.artifact.shortDescription}`,
          );
          if (detection.artifact.toolUrl) {
            logger.debug(`    Tool: ${detection.artifact.toolUrl}`);
          }
        }

        if (detection.validationResult) {
          if (detection.validationResult.valid) {
            logger.debug(`    Validation: ✓ valid`);
          } else {
            logger.warn(
              `    Validation: ✗ INVALID - ${detection.validationResult.error}`,
            );
          }
        }

        // Handle HTML conversion
        if (!isJSON(detection) && canConvertToJSON(detection)) {
          logger.debug(`  Converting ${basename(filePath)} to JSON...`);

          try {
            // Use appropriate extractor based on detected type
            const jsonData = convertToJSON(detection, filePath);

            if (jsonData) {
              // Save converted JSON
              const convertedRunDir = join(convertedDir, runId);
              mkdirSync(convertedRunDir, { recursive: true });

              const convertedFileName =
                basename(filePath, extname(filePath)) + ".json";
              const convertedFilePath = join(
                convertedRunDir,
                convertedFileName,
              );
              writeFileSync(
                convertedFilePath,
                JSON.stringify(jsonData, null, 2),
              );

              catalog.push({
                artifactName,
                artifactId,
                runId,
                detectedType: finalType,
                originalFormat: detection.originalFormat,
                filePath: convertedFilePath,
                converted: true,
                artifact: detection.artifact,
                validation: detection.validationResult,
              });

              logger.debug(`    Saved to ${convertedFilePath}`);
            } else {
              // Couldn't extract JSON, catalog the HTML as-is
              logger.debug(`    Could not extract JSON, cataloging original`);
              catalog.push({
                artifactName,
                artifactId,
                runId,
                detectedType: finalType,
                originalFormat: detection.originalFormat,
                filePath,
                artifact: detection.artifact,
                validation: detection.validationResult,
              });
            }
          } catch (error) {
            logger.error(
              `    Failed to convert original: ${error instanceof Error ? error.message : String(error)}`,
            );
            catalog.push({
              artifactName,
              artifactId,
              runId,
              detectedType: finalType,
              originalFormat: detection.originalFormat,
              filePath,
              artifact: detection.artifact,
              validation: detection.validationResult,
            });
          }
        } else {
          // Non-HTML or non-convertible, just catalog
          catalog.push({
            artifactName,
            artifactId,
            runId,
            detectedType: finalType,
            originalFormat: detection.originalFormat,
            filePath,
            artifact: detection.artifact,
            validation: detection.validationResult,
          });
        }
      }
    }
  }

  // Save catalog
  const catalogPath = join(outputDir, "catalog.json");
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
  logger.info(`Saved catalog to ${catalogPath}`);

  return { catalog };
}

function getAllFiles(dir: string): string[] {
  const files: string[] = [];

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function applyCustomArtifactType(
  filePath: string,
  detectedType: string,
  customMappings?: ArtifactTypeMapping[],
): string {
  // If type is already known, don't override
  if (detectedType !== "unknown" || !customMappings) {
    return detectedType;
  }

  // Try to match filename against custom type patterns
  const fileName = basename(filePath);
  for (const mapping of customMappings) {
    try {
      const pattern = new RegExp(mapping.pattern);
      if (pattern.test(fileName)) {
        return mapping.type;
      }
    } catch {
      // Invalid regex, skip
      continue;
    }
  }

  return detectedType;
}
