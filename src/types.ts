// Re-export types from artifact-detective for convenience
export type {
  ArtifactType,
  OriginalFormat,
  ArtifactDescriptor,
} from "artifact-detective";

import type {
  LinterOutput as LinterOutputBase,
  ArtifactType,
  ArtifactDescriptor,
  ValidationResult as ArtifactValidationResult,
  CatalogEntry as CatalogEntryBase,
} from "artifact-detective";
export type { ArtifactValidationResult };

// Extend CatalogEntry to include artifact descriptor and validation
export interface CatalogEntry extends CatalogEntryBase {
  artifact?: ArtifactDescriptor;
  validation?: ArtifactValidationResult;
}

// Extend LinterOutput to include artifact descriptor and validation
export interface LinterOutput extends LinterOutputBase {
  artifact?: ArtifactDescriptor;
  validation?: ArtifactValidationResult;
}

export type RunConclusion = "failure" | "success" | "cancelled" | "in_progress";
export type DownloadStatus = "success" | "expired" | "failed" | "skipped";
export type ExtractionStatus = "success" | "failed" | "skipped";
export type SummaryStatus = "complete" | "partial" | "incomplete";

// Reference types for PR vs branch mode
export type RefType = "pr" | "branch";

export interface PRRef {
  type: "pr";
  prNumber: number;
}

export interface BranchRef {
  type: "branch";
  branch: string;
  remote: string;
}

export type Ref = PRRef | BranchRef;

export interface ArtifactInventoryItem {
  runId: string;
  artifactName: string;
  artifactId: number;
  sizeBytes: number;
  status: DownloadStatus;
  errorMessage?: string;
  skipReason?: string;
}

export interface JobLog {
  jobName: string;
  jobId?: string;
  extractionStatus: ExtractionStatus;
  jobStatus?: string; // Job conclusion: "failure", "success", "skipped", etc.
  logFile?: string;
  skipReason?: string;
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
  artifact?: ArtifactDescriptor;
  validation?: ArtifactValidationResult;
}

export interface ExpectationViolation {
  pattern: string;
  required: boolean;
  reason?: string;
}

export interface LogArtifactViolation {
  type: string; // The expected artifact type (e.g., "jest-json")
  required: boolean;
  reason?: string;
  matchJobName?: string; // If filtering was applied
}

export interface ValidationResult {
  workflowName: string;
  workflowPath: string;
  runId: string;
  runName: string;
  missingRequired: ExpectationViolation[];
  missingOptional: ExpectationViolation[];
  // Log artifact validation results
  missingRequiredLogArtifacts?: LogArtifactViolation[];
  missingOptionalLogArtifacts?: LogArtifactViolation[];
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

// Shared fields for both PR and branch summaries
interface BaseSummary {
  repo: string;
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
    artifactsValidated: number;
    artifactsInvalid: number;
    linterOutputsExtracted: number;
  };
}

export interface PRSummary extends BaseSummary {
  mode: "pr";
  pr: number;
  prBranch: string; // Source branch of the PR
}

export interface BranchSummary extends BaseSummary {
  mode: "branch";
  branch: string;
}

export type Summary = PRSummary | BranchSummary;

export interface SkipPattern {
  pattern: string;
  reason?: string;
}

export interface ExpectPattern {
  pattern: string;
  required?: boolean;
  reason?: string;
}

export interface ArtifactTypeMapping {
  pattern: string; // Regex to match artifact filename
  type: ArtifactType; // Expected artifact type when file matches
  reason?: string; // Why this type mapping is needed
}

export interface ArtifactExtractionConfig {
  type: ArtifactType;
  toJson?: boolean; // If true, use extractArtifactToJson for normalized JSON output
  extractorConfig?: {
    startMarker?: string; // Regex pattern as string (will be compiled to RegExp)
    endMarker?: string; // Regex pattern as string (will be compiled to RegExp)
    includeEndMarker?: boolean;
  };
  required?: boolean; // If true, expect this type in logs; false = optional
  matchJobName?: string; // Optional: only expect in jobs matching this regex
  reason?: string; // Why this artifact type extraction is configured
}

export interface WorkflowConfig {
  workflow: string;
  skipArtifacts?: SkipPattern[];
  expectArtifacts?: ExpectPattern[];
  customArtifactTypes?: ArtifactTypeMapping[]; // Per-workflow custom artifact type mappings
  extractArtifactTypesFromLogs?: ArtifactExtractionConfig[]; // Per-workflow artifact extraction
  skip?: boolean;
  description?: string;
}

export interface Config {
  outputDir?: string;
  defaultRepo?: string;
  maxRetries?: number;
  retryDelay?: number;
  pollInterval?: number; // Seconds between polls when waiting (default: 1800 = 30 min)
  maxWaitTime?: number; // Maximum seconds to wait for completion (default: 21600 = 6 hours)
  skipArtifacts?: SkipPattern[];
  customArtifactTypes?: ArtifactTypeMapping[]; // Global custom artifact type mappings
  extractArtifactTypesFromLogs?: ArtifactExtractionConfig[]; // Default artifact extraction config
  workflows?: WorkflowConfig[];
}
