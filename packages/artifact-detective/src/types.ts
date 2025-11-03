// Core artifact type definitions
export type ArtifactType =
  | "playwright-json"
  | "playwright-html"
  | "jest-json"
  | "jest-html"
  | "pytest-json"
  | "pytest-html"
  | "junit-xml"
  | "eslint-txt"
  | "tsc-txt"
  | "ruff-txt"
  | "mypy-txt"
  | "flake8-txt"
  | "cargo-test-txt"
  | "clippy-json"
  | "clippy-txt"
  | "rustfmt-txt"
  | "binary"
  | "unknown";

export type OriginalFormat = "json" | "xml" | "html" | "txt" | "binary";

// Detection result from type detector
export interface DetectionResult {
  detectedType: ArtifactType;
  originalFormat: OriginalFormat;
  isBinary: boolean;
}

// Catalog entry for an artifact
export interface CatalogEntry {
  artifactName: string;
  artifactId: number;
  runId: string;
  detectedType: ArtifactType;
  originalFormat: OriginalFormat;
  filePath: string;
  converted?: boolean;
  skipped?: boolean;
}

// Linter output detection result
export interface LinterOutput {
  detectedType: string;
  filePath: string;
}

// Linter pattern for detection
export interface LinterPattern {
  name: string;
  pattern: RegExp;
  description: string;
}

// Linter match result
export interface LinterMatch {
  linterType: string;
  content: string;
}

// Pytest-specific types
export interface PytestTest {
  nodeid: string;
  outcome: string;
  duration: number;
  log?: string; // Captured output, stack traces, error messages
  extras?: any[]; // Media attachments (screenshots, videos, etc.)
  setup?: {
    duration: number;
    outcome: string;
  };
  call?: {
    duration: number;
    outcome: string;
    longrepr?: string;
  };
  teardown?: {
    duration: number;
    outcome: string;
  };
}

export interface PytestReport {
  created: number;
  duration: number;
  exitCode: number;
  root: string;
  environment?: Record<string, string>;
  tests: PytestTest[];
}

// Playwright-specific types
export interface PlaywrightTest {
  title: string;
  status: string;
  duration: number;
  errors?: string[];
  file?: string;
  line?: number;
  column?: number;
}

export interface PlaywrightSuite {
  title: string;
  tests: PlaywrightTest[];
  suites?: PlaywrightSuite[];
}

export interface PlaywrightReport {
  suites: PlaywrightSuite[];
  stats?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}
