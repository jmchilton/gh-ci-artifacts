import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parse as parseYAML } from "yaml";
import { detectArtifactType } from "../src/detectors/type-detector.js";
import { validate, ARTIFACT_TYPE_REGISTRY } from "../src/validators/index.js";
import { extractLinterOutput } from "../src/parsers/linters/extractors.js";
import type { ArtifactType } from "../src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Generated fixture validation", () => {
  const languages = ["javascript", "python", "rust"];

  for (const lang of languages) {
    describe(`${lang} fixtures`, () => {
      const manifestPath = join(
        __dirname,
        `../fixtures/sample-projects/${lang}/manifest.yml`,
      );
      const manifest = parseYAML(readFileSync(manifestPath, "utf-8"));

      for (const artifact of manifest.artifacts) {
        const artifactPath = join(
          __dirname,
          `../fixtures/generated/${lang}/${artifact.file}`,
        );

        describe(artifact.file, () => {
          it("exists in generated/ directory", () => {
            expect(existsSync(artifactPath)).toBe(true);
          });

          const artifactType = artifact.type as ArtifactType;
          const capabilities = ARTIFACT_TYPE_REGISTRY[artifactType];

          // ALWAYS test validator if one exists (structural correctness)
          if (capabilities?.validator) {
            it("passes validator", () => {
              const content = readFileSync(artifactPath, "utf-8");
              const result = validate(artifactType, content);
              expect(result.valid).toBe(true);
              if (!result.valid) {
                console.error(`Validation error: ${result.error}`);
              }
            });
          }

          // ONLY test auto-detection if supported (based on registry)
          if (capabilities?.supportsAutoDetection) {
            it(`auto-detects as ${artifact.type}`, () => {
              const result = detectArtifactType(artifactPath);
              expect(result.detectedType).toBe(artifact.type);
              expect(result.originalFormat).toBe(artifact.format);
            });
          }

          // Test parsers if specified
          if (artifact.parsers?.includes("extractLinterOutput")) {
            it("extracts linter output", () => {
              const content = readFileSync(artifactPath, "utf-8");
              const output = extractLinterOutput(artifact.type, content);
              expect(output).toBeTruthy();
              expect(output!.length).toBeGreaterThan(0);
            });
          }
        });
      }
    });
  }
});
