import type { ArtifactType } from "../types.js";
import type { ArtifactTypeCapabilities, ValidationResult } from "./types.js";
import { validateJestJSON } from "./jest-validator.js";
import { validatePlaywrightJSON } from "./playwright-validator.js";
import { validatePlaywrightHTML } from "./playwright-html-validator.js";
import { validatePytestJSON, validatePytestHTML } from "./pytest-validator.js";
import { validateJUnitXML } from "./junit-validator.js";
import {
  validateESLintOutput,
  validateTSCOutput,
  validateFlake8Output,
  validateRuffOutput,
  validateMypyOutput,
} from "./linter-validator.js";
import { validateCargoTestOutput } from "./cargo-validator.js";
import { validateClippyJSON, validateClippyText } from "./clippy-validator.js";
import { validateRustfmtOutput } from "./rustfmt-validator.js";

export { validateJestJSON } from "./jest-validator.js";
export { validatePlaywrightJSON } from "./playwright-validator.js";
export { validatePlaywrightHTML } from "./playwright-html-validator.js";
export { validatePytestJSON, validatePytestHTML } from "./pytest-validator.js";
export { validateJUnitXML } from "./junit-validator.js";
export {
  validateESLintOutput,
  validateTSCOutput,
  validateFlake8Output,
  validateRuffOutput,
  validateMypyOutput,
} from "./linter-validator.js";
export { validateCargoTestOutput } from "./cargo-validator.js";
export { validateClippyJSON, validateClippyText } from "./clippy-validator.js";
export { validateRustfmtOutput } from "./rustfmt-validator.js";
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
    validator: validatePlaywrightHTML,
  },
  "jest-html": {
    supportsAutoDetection: true,
    validator: null,
  },
  "pytest-json": {
    supportsAutoDetection: true,
    validator: validatePytestJSON,
  },
  "pytest-html": {
    supportsAutoDetection: true,
    validator: validatePytestHTML,
  },
  "junit-xml": {
    supportsAutoDetection: true,
    validator: validateJUnitXML,
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
    validator: validateFlake8Output,
  },
  "ruff-txt": {
    supportsAutoDetection: false,
    validator: validateRuffOutput,
  },
  "mypy-txt": {
    supportsAutoDetection: false,
    validator: validateMypyOutput,
  },
  "cargo-test-txt": {
    supportsAutoDetection: false,
    validator: validateCargoTestOutput,
  },
  "clippy-json": {
    supportsAutoDetection: true,
    validator: validateClippyJSON,
  },
  "clippy-txt": {
    supportsAutoDetection: false,
    validator: validateClippyText,
  },
  "rustfmt-txt": {
    supportsAutoDetection: false,
    validator: validateRustfmtOutput,
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
