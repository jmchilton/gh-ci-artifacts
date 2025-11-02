export type RunConclusion = "failure" | "success" | "cancelled" | "in_progress";
export type DownloadStatus = "success" | "expired" | "failed" | "skipped";
export type ExtractionStatus = "success" | "failed";
export type SummaryStatus = "complete" | "partial" | "incomplete";

export type ArtifactType =
  | "playwright-json"
  | "playwright-html"
  | "jest-json"
  | "jest-html"
  | "pytest-json"
  | "pytest-html"
  | "junit-xml"
  | "eslint-txt"
  | "flake8-txt"
  | "binary"
  | "unknown";

export type OriginalFormat = "json" | "xml" | "html" | "txt" | "binary";

export interface ArtifactInventoryItem {
  runId: string;
  artifactName: string;
  artifactId: number;
  sizeBytes: number;
  status: DownloadStatus;
  errorMessage?: string;
  skipReason?: string;
}

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

export interface LinterOutput {
  detectedType: string;
  filePath: string;
}

export interface JobLog {
  jobName: string;
  extractionStatus: ExtractionStatus;
  logFile?: string;
  linterOutputs?: LinterOutput[];
}

export interface RunArtifact {
  name: string;
  sizeBytes: number;
  downloadStatus: DownloadStatus;
  errorMessage?: string;
  detectedType?: string;
  filePath?: string;
  converted?: boolean;
}

export interface ExpectationViolation {
  pattern: string;
  required: boolean;
  reason?: string;
}

export interface ValidationResult {
  workflowName: string;
  workflowPath: string;
  runId: string;
  runName: string;
  missingRequired: ExpectationViolation[];
  missingOptional: ExpectationViolation[];
}

export interface RunSummary {
  runId: string;
  workflowName: string;
  workflowPath: string;
  runAttempt: number;
  runNumber: number;
  conclusion: RunConclusion;
  artifacts: RunArtifact[];
  logs: JobLog[];
  validationResult?: ValidationResult;
}

export interface Summary {
  repo: string;
  pr: number;
  headSha: string;
  analyzedAt: string;
  status: SummaryStatus;
  inProgressRuns: number;
  runs: RunSummary[];
  catalogFile: string;
  validationResults?: ValidationResult[];
  stats: {
    totalRuns: number;
    artifactsDownloaded: number;
    artifactsFailed: number;
    logsExtracted: number;
    htmlConverted: number;
  };
}

export interface SkipPattern {
  pattern: string;
  reason?: string;
}

export interface ExpectPattern {
  pattern: string;
  required?: boolean;
  reason?: string;
}

export interface WorkflowConfig {
  workflow: string;
  skipArtifacts?: SkipPattern[];
  expectArtifacts?: ExpectPattern[];
  skip?: boolean;
  description?: string;
}

export interface Config {
  outputDir?: string;
  defaultRepo?: string;
  maxRetries?: number;
  retryDelay?: number;
  pollInterval?: number;  // Seconds between polls when waiting (default: 1800 = 30 min)
  maxWaitTime?: number;   // Maximum seconds to wait for completion (default: 21600 = 6 hours)
  skipArtifacts?: SkipPattern[];
  workflows?: WorkflowConfig[];
}
