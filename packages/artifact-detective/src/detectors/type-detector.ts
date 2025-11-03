import { readFileSync, statSync, openSync, readSync, closeSync } from "fs";
import type { ArtifactType, OriginalFormat, DetectionResult } from "../types.js";

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".mp4",
  ".webm",
  ".mov",
  ".zip",
  ".tar",
  ".gz",
  ".bz2",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
]);

// Maximum bytes to read for content inspection
const CONTENT_SAMPLE_SIZE = 50000; // 50KB should be enough for HTML <head> and initial content

export function detectArtifactType(filePath: string): DetectionResult {
  const fileName = filePath.toLowerCase();

  // Check for binary files by extension first (no need to read content)
  if (isBinaryFile(fileName)) {
    return {
      detectedType: "binary",
      originalFormat: "binary",
      isBinary: true,
    };
  }

  // Determine format by extension
  const originalFormat = getOriginalFormat(fileName);

  // For text-based formats, inspect content
  if (originalFormat !== "binary") {
    try {
      const content = readFileSample(filePath);
      const detectedType = detectByContent(content, originalFormat);

      return {
        detectedType,
        originalFormat,
        isBinary: false,
      };
    } catch (error) {
      // File read error, fall back to unknown
      return {
        detectedType: "unknown",
        originalFormat,
        isBinary: false,
      };
    }
  }

  // Unknown binary
  return {
    detectedType: "unknown",
    originalFormat: "binary",
    isBinary: true,
  };
}

function isBinaryFile(fileName: string): boolean {
  return Array.from(BINARY_EXTENSIONS).some((ext) => fileName.endsWith(ext));
}

function getOriginalFormat(fileName: string): OriginalFormat {
  if (fileName.endsWith(".json")) return "json";
  if (fileName.endsWith(".xml")) return "xml";
  if (fileName.endsWith(".html") || fileName.endsWith(".htm")) return "html";
  if (fileName.endsWith(".txt") || fileName.endsWith(".log")) return "txt";
  return "binary";
}

function readFileSample(filePath: string): string {
  const stats = statSync(filePath);
  const bytesToRead = Math.min(stats.size, CONTENT_SAMPLE_SIZE);
  const buffer = Buffer.alloc(bytesToRead);

  const fd = openSync(filePath, "r");
  try {
    readSync(fd, buffer, 0, bytesToRead, 0);
    return buffer.toString("utf-8");
  } finally {
    closeSync(fd);
  }
}

function detectByContent(
  content: string,
  format: OriginalFormat,
): ArtifactType {
  const lowerContent = content.toLowerCase();

  switch (format) {
    case "html":
      return detectHtmlType(content, lowerContent);

    case "json":
      return detectJsonType(content, lowerContent);

    case "xml":
      return detectXmlType(content, lowerContent);

    case "txt":
      return detectTxtType(content, lowerContent);

    default:
      return "unknown";
  }
}

function detectHtmlType(content: string, lowerContent: string): ArtifactType {
  // pytest-html: Look for pytest-html generator meta tag or link
  if (
    lowerContent.includes("pytest-html") ||
    lowerContent.includes("pypi.python.org/pypi/pytest-html")
  ) {
    return "pytest-html";
  }

  // Playwright HTML reporter: Look for Playwright-specific markers
  // Playwright's HTML reporter includes distinctive elements like:
  // - "playwright-report" class or id
  // - "Playwright Test Report" title
  // - "@playwright/test" or "playwright.dev" references
  if (
    lowerContent.includes("playwright test report") ||
    lowerContent.includes("playwright-report") ||
    lowerContent.includes("playwright.dev") ||
    lowerContent.includes("@playwright/test")
  ) {
    return "playwright-html";
  }

  // Jest HTML reporters often include "jest" in generator or have jest-html classes
  if (
    lowerContent.includes("jest-html") ||
    (lowerContent.includes("jest") && lowerContent.includes("test results"))
  ) {
    return "jest-html";
  }

  return "unknown";
}

function detectJsonType(content: string, lowerContent: string): ArtifactType {
  try {
    // Clippy JSON: newline-delimited JSON with "reason" field
    // Check lines for clippy pattern (compiler-message, compiler-artifact, build-finished)
    const lines = content.split("\n");
    for (const line of lines) {
      if (!line.trim().startsWith("{")) continue; // Skip non-JSON lines
      try {
        const obj = JSON.parse(line);
        if (
          obj.reason &&
          ["compiler-message", "compiler-artifact", "build-finished"].includes(
            obj.reason,
          )
        ) {
          return "clippy-json";
        }
      } catch {
        // Line isn't valid JSON, continue
        continue;
      }
    }

    // Try to parse JSON to inspect structure
    const data = JSON.parse(content);

    // Playwright JSON: Has "config", "suites" with specific structure
    if (data.config && data.suites && Array.isArray(data.suites)) {
      // Check for Playwright-specific fields
      if (
        data.config.rootDir !== undefined ||
        data.config.version !== undefined
      ) {
        return "playwright-json";
      }
    }

    // Jest JSON: Has "testResults" array with specific structure
    if (data.testResults && Array.isArray(data.testResults)) {
      return "jest-json";
    }

    // pytest JSON: Common format has "tests" array or "report" structure
    if (data.tests && Array.isArray(data.tests)) {
      return "pytest-json";
    }

    // Check content for framework mentions as fallback
    if (lowerContent.includes("playwright")) {
      return "playwright-json";
    }
    if (lowerContent.includes("jest")) {
      return "jest-json";
    }
    if (lowerContent.includes("pytest")) {
      return "pytest-json";
    }
  } catch (e) {
    // Invalid JSON, fall through to unknown
  }

  return "unknown";
}

function detectXmlType(content: string, lowerContent: string): ArtifactType {
  // JUnit XML format
  if (
    lowerContent.includes("<testsuite") ||
    lowerContent.includes("<testsuites")
  ) {
    return "junit-xml";
  }

  return "unknown";
}

function detectTxtType(content: string, lowerContent: string): ArtifactType {
  // Plain text files are too ambiguous for reliable auto-detection.
  // Use validators instead to verify content matches expected format.

  // Only detect flake8 as it has unique Python-specific pattern
  if (/\.py:\d+:\d+:/.test(content)) {
    return "flake8-txt";
  }

  return "unknown";
}
