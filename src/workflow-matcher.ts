import { basename, extname } from 'path';
import type { WorkflowRun } from './github/api.js';
import type { WorkflowConfig, SkipPattern, ExpectPattern, ExpectationViolation, ValidationResult } from './types.js';

/**
 * Get workflow name from path (basename without extension)
 * Example: ".github/workflows/ci.yml" -> "ci"
 */
export function getWorkflowName(run: WorkflowRun): string {
  const base = basename(run.path);
  return basename(base, extname(base));
}

/**
 * Find workflow config for a run
 * Matches on workflow basename without extension
 */
export function findWorkflowConfig(
  run: WorkflowRun,
  configs: WorkflowConfig[]
): WorkflowConfig | undefined {
  const workflowName = getWorkflowName(run);
  return configs.find(config => config.workflow === workflowName);
}

/**
 * Check if an artifact should be skipped based on skip patterns
 * Returns the matching pattern if artifact should be skipped, undefined otherwise
 */
export function shouldSkipArtifact(
  artifactName: string,
  skipPatterns: SkipPattern[]
): SkipPattern | undefined {
  for (const pattern of skipPatterns) {
    try {
      const regex = new RegExp(pattern.pattern);
      if (regex.test(artifactName)) {
        return pattern;
      }
    } catch (error) {
      // Invalid regex - skip this pattern
      console.warn(`Invalid skip pattern "${pattern.pattern}": ${error}`);
    }
  }
  return undefined;
}

/**
 * Build combined skip patterns (global + workflow-specific)
 */
export function getCombinedSkipPatterns(
  globalPatterns: SkipPattern[] = [],
  workflowPatterns: SkipPattern[] = []
): SkipPattern[] {
  return [...globalPatterns, ...workflowPatterns];
}

/**
 * Check if an artifact name matches an expect pattern
 */
function matchesExpectPattern(artifactName: string, pattern: ExpectPattern): boolean {
  try {
    const regex = new RegExp(pattern.pattern);
    return regex.test(artifactName);
  } catch (error) {
    console.warn(`Invalid expect pattern "${pattern.pattern}": ${error}`);
    return false;
  }
}

/**
 * Validate that expected artifacts are present
 * Returns validation result with missing required and optional artifacts
 */
export function validateExpectations(
  run: WorkflowRun,
  workflowConfig: WorkflowConfig | undefined,
  artifactNames: string[]
): ValidationResult | undefined {
  // No validation needed if no expectations configured
  if (!workflowConfig?.expectArtifacts || workflowConfig.expectArtifacts.length === 0) {
    return undefined;
  }

  const workflowName = getWorkflowName(run);
  const missingRequired: ExpectationViolation[] = [];
  const missingOptional: ExpectationViolation[] = [];

  // Check each expectation
  for (const expectation of workflowConfig.expectArtifacts) {
    const required = expectation.required !== false; // Default to true
    const matched = artifactNames.some(name => matchesExpectPattern(name, expectation));

    if (!matched) {
      const violation: ExpectationViolation = {
        pattern: expectation.pattern,
        required,
        reason: expectation.reason,
      };

      if (required) {
        missingRequired.push(violation);
      } else {
        missingOptional.push(violation);
      }
    }
  }

  // Only return result if there are violations
  if (missingRequired.length === 0 && missingOptional.length === 0) {
    return undefined;
  }

  return {
    workflowName,
    workflowPath: run.path,
    runId: String(run.id),
    runName: run.name,
    missingRequired,
    missingOptional,
  };
}
