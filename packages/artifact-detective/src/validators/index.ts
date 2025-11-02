import type { ArtifactType } from "../types.js";
import type { ArtifactTypeCapabilities, ValidationResult } from "./types.js";
import { validateJestJSON } from "./jest-validator.js";
import { validatePlaywrightJSON } from "./playwright-validator.js";
import { validateESLintOutput, validateTSCOutput } from "./linter-validator.js";

export { validateJestJSON } from "./jest-validator.js";
export { validatePlaywrightJSON } from "./playwright-validator.js";
export { validateESLintOutput, validateTSCOutput } from "./linter-validator.js";
export type { ValidationResult, ValidatorFunction, ArtifactTypeCapabilities } from "./types.js";

/**
 * Registry of artifact type capabilities and validators.
 * 
 * - supportsAutoDetection: true if the type has unique structural markers for reliable auto-detection
 * - validator: function to validate content matches expected format (null if no validator)
 */
export const ARTIFACT_TYPE_REGISTRY: Record<ArtifactType, ArtifactTypeCapabilities> = {
  "jest-json": {
    supportsAutoDetection: true,
    validator: validateJestJSON,
  },
  "playwright-json": {
    supportsAutoDetection: true,
    validator: validatePlaywrightJSON,
  },
  "playwright-html": {
    supportsAutoDetection: true,
    validator: null,
  },
  "jest-html": {
    supportsAutoDetection: true,
    validator: null,
  },
  "pytest-json": {
    supportsAutoDetection: true,
    validator: null,
  },
  "pytest-html": {
    supportsAutoDetection: true,
    validator: null,
  },
  "junit-xml": {
    supportsAutoDetection: true,
    validator: null,
  },
  "eslint-txt": {
    supportsAutoDetection: false,
    validator: validateESLintOutput,
  },
  "tsc-txt": {
    supportsAutoDetection: false,
    validator: validateTSCOutput,
  },
  "flake8-txt": {
    supportsAutoDetection: false,
    validator: null,
  },
  "binary": {
    supportsAutoDetection: true,
    validator: null,
  },
  "unknown": {
    supportsAutoDetection: false,
    validator: null,
  },
};

/**
 * Central validation entry point. Dispatches to appropriate validator based on artifact type.
 * 
 * @param type - The artifact type to validate
 * @param content - The file content as a string
 * @returns ValidationResult indicating if content is valid for the given type
 */
export function validate(type: ArtifactType, content: string): ValidationResult {
  const capabilities = ARTIFACT_TYPE_REGISTRY[type];
  
  if (!capabilities) {
    return {
      valid: false,
      error: `Unknown artifact type: ${type}`,
    };
  }
  
  if (!capabilities.validator) {
    return {
      valid: false,
      error: `No validator available for type: ${type}`,
    };
  }
  
  return capabilities.validator(content);
}
