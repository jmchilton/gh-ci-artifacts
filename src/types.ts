export type RunConclusion = 'failure' | 'success' | 'cancelled' | 'in_progress';
export type DownloadStatus = 'success' | 'expired' | 'failed';
export type ExtractionStatus = 'success' | 'failed';
export type SummaryStatus = 'complete' | 'partial' | 'incomplete';

export type ArtifactType =
  | 'playwright-json'
  | 'jest-json'
  | 'pytest-json'
  | 'junit-xml'
  | 'playwright-html'
  | 'eslint-txt'
  | 'binary'
  | 'unknown';

export type OriginalFormat = 'json' | 'xml' | 'html' | 'txt' | 'binary';

export interface ArtifactInventoryItem {
  runId: string;
  artifactName: string;
  sizeBytes: number;
  status: DownloadStatus;
  errorMessage?: string;
}

export interface CatalogEntry {
  artifactName: string;
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

export interface RunSummary {
  runId: string;
  conclusion: RunConclusion;
  artifacts: RunArtifact[];
  logs: JobLog[];
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
  stats: {
    totalRuns: number;
    artifactsDownloaded: number;
    artifactsFailed: number;
    logsExtracted: number;
    htmlConverted: number;
  };
}

export interface Config {
  outputDir?: string;
  defaultRepo?: string;
  maxRetries?: number;
  retryDelay?: number;
}
