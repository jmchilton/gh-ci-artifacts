import type { ValidationResult } from "./types.js";

/**
 * Validates rustfmt check output format
 * Expected patterns:
 * - Diff output showing formatting differences
 * - File paths with "Diff in..." lines
 * - Empty output is valid (no formatting issues)
 */
export function validateRustfmtOutput(content: string): ValidationResult {
  // Empty output is valid (no formatting issues)
  if (content.trim() === "") {
    return { valid: true };
  }

  // Check for diff patterns
  const diffPattern = /Diff\s+in\s+\S+\.rs/i.test(content);
  const filePattern = /\S+\.rs/i.test(content);

  // rustfmt --check outputs diffs or file names
  if (diffPattern || filePattern) {
    return { valid: true };
  }

  return {
    valid: false,
    error: "Does not match rustfmt output format",
  };
}
