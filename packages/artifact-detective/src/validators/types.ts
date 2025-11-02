import type { ArtifactType } from "../types.js";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export type ValidatorFunction = (content: string) => ValidationResult;

export interface ArtifactTypeCapabilities {
  supportsAutoDetection: boolean;
  validator: ValidatorFunction | null;
}
