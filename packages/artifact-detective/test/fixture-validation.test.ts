import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parse as parseYAML } from "yaml";
import { detectArtifactType } from "../src/detectors/type-detector.js";
import {
  detectLinterType,
  extractLinterOutput,
} from "../src/parsers/linters/extractors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Generated fixture validation", () => {
  const languages = ["javascript"]; // Expand to ['javascript', 'python'] later

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

          it(`detects as ${artifact.type}`, () => {
            const result = detectArtifactType(artifactPath);
            expect(result.detectedType).toBe(artifact.type);
            expect(result.originalFormat).toBe(artifact.format);
          });

          // Test parsers if specified
          if (artifact.parsers?.includes("detectLinterType")) {
            it("detects linter type from content", () => {
              const content = readFileSync(artifactPath, "utf-8");
              // Use appropriate job name based on artifact type
              const jobName = artifact.type.includes("tsc") ? "typecheck" : "lint";
              const linterType = detectLinterType(jobName, content);
              expect(linterType).toBeTruthy();
            });
          }

          if (artifact.parsers?.includes("extractLinterOutput")) {
            it("extracts linter output", () => {
              const content = readFileSync(artifactPath, "utf-8");
              // Use appropriate job name based on artifact type
              const jobName = artifact.type.includes("tsc") ? "typecheck" : "lint";
              const linterType = detectLinterType(jobName, content);
              expect(linterType).toBeTruthy();

              const output = extractLinterOutput(linterType!, content);
              expect(output).toBeTruthy();
              expect(output!.length).toBeGreaterThan(0);
            });
          }
        });
      }
    });
  }
});
