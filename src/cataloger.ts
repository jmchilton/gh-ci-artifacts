import { readdirSync, statSync, mkdirSync, writeFileSync } from 'fs';
import { join, basename } from 'path';
import type { Logger } from './utils/logger.js';
import type { CatalogEntry, ArtifactInventoryItem } from './types.js';
import { detectArtifactType } from './detectors/type-detector.js';
import { extractPlaywrightJSON } from './parsers/html/playwright-html.js';

export interface CatalogResult {
  catalog: CatalogEntry[];
}

export async function catalogArtifacts(
  outputDir: string,
  runIds: string[],
  inventory: ArtifactInventoryItem[],
  logger: Logger
): Promise<CatalogResult> {
  const catalog: CatalogEntry[] = [];
  const rawDir = join(outputDir, 'raw');
  const convertedDir = join(outputDir, 'converted');

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
    const artifactDirs = readdirSync(runDir).filter(name => {
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
        item => item.runId === runId && item.artifactId === artifactId
      );
      
      if (!artifactInfo) {
        logger.warn(`Could not find inventory entry for artifact ${artifactId} in run ${runId}`);
        continue;
      }
      
      const artifactName = artifactInfo.artifactName;
      const artifactDir = join(runDir, dirName);
      const files = getAllFiles(artifactDir);

      for (const filePath of files) {
        const detection = detectArtifactType(filePath);

        if (detection.isBinary) {
          // Skip binary files
          catalog.push({
            artifactName,
            artifactId,
            runId,
            detectedType: detection.detectedType,
            originalFormat: detection.originalFormat,
            filePath,
            skipped: true,
          });
          continue;
        }

        // Handle HTML conversion
        if (detection.originalFormat === 'html' && detection.detectedType === 'playwright-html') {
          logger.debug(`  Converting ${basename(filePath)} to JSON...`);

          try {
            const jsonData = extractPlaywrightJSON(filePath);

            if (jsonData) {
              // Save converted JSON
              const convertedRunDir = join(convertedDir, runId);
              mkdirSync(convertedRunDir, { recursive: true });

              const convertedFileName = basename(filePath, '.html') + '.json';
              const convertedFilePath = join(convertedRunDir, convertedFileName);
              writeFileSync(convertedFilePath, JSON.stringify(jsonData, null, 2));

              catalog.push({
                artifactName,
                artifactId,
                runId,
                detectedType: detection.detectedType,
                originalFormat: detection.originalFormat,
                filePath: convertedFilePath,
                converted: true,
              });

              logger.debug(`    Saved to ${convertedFilePath}`);
            } else {
              // Couldn't extract JSON, catalog the HTML as-is
              logger.debug(`    Could not extract JSON, cataloging HTML`);
              catalog.push({
                artifactName,
                artifactId,
                runId,
                detectedType: detection.detectedType,
                originalFormat: detection.originalFormat,
                filePath,
              });
            }
          } catch (error) {
            logger.error(
              `    Failed to convert HTML: ${error instanceof Error ? error.message : String(error)}`
            );
            catalog.push({
              artifactName,
              artifactId,
              runId,
              detectedType: detection.detectedType,
              originalFormat: detection.originalFormat,
              filePath,
            });
          }
        } else {
          // Non-HTML or non-convertible, just catalog
          catalog.push({
            artifactName,
            artifactId,
            runId,
            detectedType: detection.detectedType,
            originalFormat: detection.originalFormat,
            filePath,
          });
        }
      }
    }
  }

  // Save catalog
  const catalogPath = join(outputDir, 'catalog.json');
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
