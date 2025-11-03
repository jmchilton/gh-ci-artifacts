import { describe, it, expect } from "vitest";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { detectArtifactType } from "../src/detectors/type-detector.js";
import { validate, ARTIFACT_TYPE_REGISTRY } from "../src/validators/index.js";
import type { ArtifactType } from "../src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = join(__dirname, "../fixtures");

// Helper to test both detection and validation
function testArtifact(
  fixturePath: string,
  expectedType: ArtifactType,
  expectedFormat: string,
) {
  const result = detectArtifactType(fixturePath);
  expect(result.detectedType).toBe(expectedType);
  expect(result.originalFormat).toBe(expectedFormat);
  expect(result.isBinary).toBe(false);

  // Also run validator if one exists
  const capabilities = ARTIFACT_TYPE_REGISTRY[expectedType];
  if (capabilities?.validator) {
    const content = readFileSync(fixturePath, "utf-8");
    const validationResult = validate(expectedType, content);
    expect(validationResult.valid).toBe(true);
    if (!validationResult.valid) {
      console.error(`Validation failed: ${validationResult.error}`);
    }
  }
}

describe("detectArtifactType", () => {
  describe("HTML detection", () => {
    it("detects pytest-html by content", () => {
      // Use the generated pytest-html fixture
      testArtifact(
        join(FIXTURES_DIR, "generated/python/pytest-report.html"),
        "pytest-html",
        "html",
      );
    });

    it("detects playwright-html by content", () => {
      testArtifact(
        join(FIXTURES_DIR, "html/playwright-html-sample.html"),
        "playwright-html",
        "html",
      );
    });
  });

  describe("JSON detection", () => {
    it("detects playwright JSON by structure", () => {
      testArtifact(
        join(FIXTURES_DIR, "json/playwright-json-sample.json"),
        "playwright-json",
        "json",
      );
    });

    it("detects jest JSON by structure", () => {
      testArtifact(
        join(FIXTURES_DIR, "json/jest-json-sample.json"),
        "jest-json",
        "json",
      );
    });

    it("detects pytest JSON by structure", () => {
      testArtifact(
        join(FIXTURES_DIR, "json/pytest-json-sample.json"),
        "pytest-json",
        "json",
      );
    });

    it("returns unknown for generic JSON without test framework markers", () => {
      const result = detectArtifactType(
        join(FIXTURES_DIR, "json/generic-data.json"),
      );
      expect(result.detectedType).toBe("unknown");
      expect(result.originalFormat).toBe("json");
      expect(result.isBinary).toBe(false);
    });
  });

  describe("XML detection", () => {
    it("detects JUnit XML by content", () => {
      testArtifact(
        join(FIXTURES_DIR, "xml/junit-sample.xml"),
        "junit-xml",
        "xml",
      );
    });
  });

  describe("Text detection", () => {
    it("does not auto-detect eslint output (use validators instead)", () => {
      const result = detectArtifactType(
        join(FIXTURES_DIR, "txt/eslint-sample.txt"),
      );
      // Plain text files are too ambiguous for reliable auto-detection
      expect(result.detectedType).toBe("unknown");
      expect(result.originalFormat).toBe("txt");
      expect(result.isBinary).toBe(false);

      // But validator should work
      const content = readFileSync(
        join(FIXTURES_DIR, "txt/eslint-sample.txt"),
        "utf-8",
      );
      const validationResult = validate("eslint-txt", content);
      expect(validationResult.valid).toBe(true);
    });

    it("detects flake8 output by pattern", () => {
      testArtifact(
        join(FIXTURES_DIR, "txt/flake8-sample.txt"),
        "flake8-txt",
        "txt",
      );
    });
  });

  describe("Binary detection", () => {
    it("detects PNG as binary", () => {
      const result = detectArtifactType("/path/to/screenshot.png");
      expect(result.detectedType).toBe("binary");
      expect(result.originalFormat).toBe("binary");
      expect(result.isBinary).toBe(true);
    });

    it("detects video as binary", () => {
      const result = detectArtifactType("/path/to/recording.mp4");
      expect(result.detectedType).toBe("binary");
      expect(result.originalFormat).toBe("binary");
      expect(result.isBinary).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("handles file read errors (returns unknown with correct format)", () => {
      // Non-existent file should return unknown but detect format by extension
      const result = detectArtifactType("/nonexistent/file.json");
      expect(result.detectedType).toBe("unknown");
      expect(result.originalFormat).toBe("json");
      expect(result.isBinary).toBe(false);
    });

    it("detects format by extension for unreadable files", () => {
      const xmlResult = detectArtifactType("/nonexistent/file.xml");
      expect(xmlResult.originalFormat).toBe("xml");
      expect(xmlResult.detectedType).toBe("unknown");

      const htmlResult = detectArtifactType("/nonexistent/file.html");
      expect(htmlResult.originalFormat).toBe("html");
      expect(htmlResult.detectedType).toBe("unknown");
    });
  });
});
